var Promise = require('bluebird');
var base64Img = require('base64-img');
var cLogger = require('color-log');
var dbController = require('../controller/db');
var OAuthFlow = require('../oauth/oauth_flow');
var Hijacker = require('../hijacker/hijacker');
var Worker = require('../worker/worker_producer');
var ErrorHelper = require('../errors/errors');
var Errors = require('../errors/defined_errors');
var Attr = require('../config/attributes');
var shell = require('shelljs');

// --------------------------------------------
// Constants below.
// --------------------------------------------

// The CDN URL
const cdnURL = "https://d2b3tzzd3kh620.cloudfront.net";

const downloadingClipNotification = "currently-clipping";
const needTitleOrDescriptionNotification = "need-title-or-description";
// The names of all of the clip flow notifications, this is used to clear when adding a new one.
const clipFlowNotifications = [downloadingClipNotification, needTitleOrDescriptionNotification];

const defaultTTL = 3600; // 1 hour.

const topGamesRedisKey = "top_twitch_games";
const topGamesRedisTTL = defaultTTL;
const userDefaultsOverviewKey = "user_defaults_overview_";
const userDefaultsOverviewTTL = defaultTTL;
const userClippingKey = "user_already_clipping_";
const userClippingTTL = defaultTTL;
const clipVideoTTL = defaultTTL;
const validUserRedisKey = "valid_user_";
const validUserRedisTTL = defaultTTL;

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// registerUser
// Registers a user in the AutoTuber backend.
// Example data from wordpress site:
/*
userData:  {
    "content[data][ID]": "153618901",
    "content[data][user_login]": "deletethis17",
    "content[data][user_pass]": "$P$BfNxI1FOHhtUVxCwXsbZAFVd.TGuud0",
    "content[data][user_nicename]": "deletethis17",
    "content[data][user_email]": "rusop@red-mail.info",
    "content[data][user_url]": "",
    "content[data][user_registered]": "2019-03-31 21:12:25",
    "content[data][user_activation_key]": "",
    "content[data][user_status]": "0",
    "content[data][display_name]": "deletethis17",
    "content[ID]": "153618901",
    "content[caps][pms_subscription_plan_667]": "1",
    "content[cap_key]": "wp_capabilities",
    "content[roles][0]": "pms_subscription_plan_667",
    "content[allcaps][read]": "1",
    "content[allcaps][pms_subscription_plan_667]": "1" 
}
*/
module.exports.registerUser = function(userData) {
    return new Promise(function(resolve, reject) {
        let userID = userData['content[data][ID]'];
        let userName = userData['content[data][user_login]'];
        let userEmail = userData['content[data][user_email]'];

        return dbController.registerUser(userName, userID, userEmail)
        .then(function() {
            return resolve();
        })
        .catch(function(err) {
            return reject(err);
        })
    });
}

// updateUserPassword
// Wrapper for updateUser for specifically updating password.
module.exports.updateUserPassword = function(userData) {
    userData['new_user[data][ID]'] = userData['old_user[data][ID]'];
    userData['new_user[data][user_login]'] = userData['old_user[data][user_login]'];
    userData['new_user[data][user_email]'] = userData['old_user[data][user_email]'];
    userData['new_user[data][user_pass]'] = userData['new_password'];
    return updateUserHelper(userData);
}

// updateUser
// Updates a users email or password
module.exports.updateUser = function(userData) {
    return updateUserHelper(userData);
}

// updateUserData
// Handles the update user data endpoint, this endpoint is hit every time a request comes in first.
// This checks with stripe and handles all of our checks to make sure the user can continue with the product.
module.exports.updateUserData = function(username, ID, email, password, payments, subs, currentRoute) {
    var activeSubscriptionNum = -1;

    return new Promise(function(resolve, reject) {
    	return dbController.createOrUpdateUserSubscriptions(username, ID, email, password, payments, subs)
    	.then(function(activeSubscription) {
            activeSubscriptionNum = activeSubscription;

            if (currentRoute == null) {
                return resolve([activeSubscription, []]);
            } else {
                return getCurrentRouteNotifications(ID, currentRoute);
            }
    	})
        .then(function(notifications) {
            return resolve([activeSubscriptionNum, notifications]);
        })
    	.catch(function(err) {
    		return reject(err);
    	});
    });
};

// hasUserToken
// Returns whether a user has a token stored already. Or not. This is an authenticated route.
module.exports.hasUserToken = function(username, ID, email, password) {
    return new Promise(function(resolve, reject) {
    	return validateUserAndGetID(username, ID, email, password)
    	.then(function(id) {
    		return userHasTokenHelper(id);
    	})
    	.then(function(userToken) {
            return resolve(userToken);
    	})
    	.catch(function(err) {
    		return reject(err);
    	});
    });
};

// hasNewUserToken
// Returns whether a user has a token stored today. Or not. This is an authenticated route.
module.exports.hasNewUserToken = function(username, ID, email, password) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, ID, email, password)
        .then(function(id) {
            return dbController.hasNewUserToken(id);
        })
        .then(function(userToken) {
            if (userToken == undefined) {
                return resolve(false);
            }
            return resolve(true);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
};

// getTokenLink
// Returns a link to authenticate with Youtube. This is an authenticated route.
module.exports.getTokenLink = function(username, ID, email, password) {
    return new Promise(function(resolve, reject) {
    	return validateUserAndGetID(username, ID, email, password)
    	.then(function(id) {
            return OAuthFlow.initLink(id);
    	})
    	.then(function(url) {
    		return resolve(url);
    	})
    	.catch(function(err) {
    		return reject(err);
    	});
    });
};

// seenNotification
// Marks a notification as seen
module.exports.seenNotification = function(username, ID, email, password, notifName) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, ID, email, password)
        .then(function(id) {
            return dbController.seenNotification(ID, notifName);
        })
        .then(function() {
            return resolve();
        })
        .catch(function(err) {
            return reject(err);
        })
    });
};

// updateSetting
// Updates a users default setting
module.exports.updateSetting = function(username, pmsID, email, password, settingName, settingJSON) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            return updateDefaultSetting(pmsID, settingName, settingJSON);
        })
        .then(function(ok) {
            return resolve(ok);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// getSettings
// Gets a users settings, can have a few scopes:
// 1) overview -> only returns the count of things, and basic numbers.
// 2) setting_name -> gets that specific setting
module.exports.getSettings = function(username, pmsID, email, password, scope) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            return getSettingsHelper(pmsID, scope);
        })
        .then(function(results) {
            return resolve(results);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// getGamesList
// Returns the top 100 games from twitch
module.exports.getGamesList = function() {
    return new Promise(function(resolve, reject) {
        return checkIfInRedis(topGamesRedisKey)
        .then(function(value) {
            if (value != undefined) {
                return resolve(JSON.parse(value));
            }

            return twitch.games.top({
                limit: 100
            }, (err, res) => {
                if (err) {
                    cLogger.error(err);
                    return reject(err);
                } else {
                    var result = [];
                    var unparsed = res.top;

                    if (unparsed.length == 0) {
                        return resolve([]);
                    }

                    var count = 0;

                    function next() {
                        result.push(unparsed[count].game.name);
                        count++;
                        if (count < unparsed.length) {
                            return next();
                        } else {
                            redis.set(topGamesRedisKey, JSON.stringify(result), "EX", topGamesRedisTTL);
                            return resolve(result);
                        }
                    }

                    return next();
                }
            });
        });
    });
}

// startClip
// Starts a clip for a user if they are authorized too, and they don't already have a clip started.
module.exports.startClip = function(username, pmsID, email, password, twitch_link) {
    var userID = "pms_" + pmsID;
    var downloadID = null;
    var result = [false, "Internal Server Error"];
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;
            return userAlreadyClipping(userID);
        })
        .then(function(alreadyClipping) {
            if (alreadyClipping == undefined || alreadyClipping == "false") {
                return validateClipGame(twitch_link);
            } else {
                return reject(Errors.alreadyClippingErr());
            }
        })
        .then(function(gameName) {
            if (gameName != undefined) {
                return Worker.addDownloadingTask((userID + ""), twitch_link, gameName);
            } else {
                return resolve([false, "The stream link was invalid, or not live."]);
            }
        })
        .then(function(dlID) {
            downloadID = dlID;
            return setUserDownloading(userID, downloadID);
        })
        .then(function() {
            result = [true, downloadID];
            return setUserDownloadingNotification(pmsID, downloadID);
        })
        .then(function() {
            return resolve(result);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// endClip
// Ends a clip for a user if they are authorized too.
module.exports.endClip = function(username, pmsID, email, password, twitch_link, downloadID) {
    var userID = "pms_" + pmsID;
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;
            return Hijacker.endHijacking(userID, twitch_link, parseInt(downloadID));
        })
        .then(function() {
            return setUserNotDownloading(userID);
        })
        .then(function() {
            return removeUserDownloadingNotification(pmsID);
        })
        .then(function() {
            return resolve();
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// isUserDownloading
// Returns whether a user is downloading or not, and if so returns the download ID.
module.exports.isUserDownloading = function(username, pmsID, email, password) {
    var userID = "pms_" + pmsID;
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;
            return userAlreadyClipping(id);
        })
        .then(function(downloadID) {
            if (downloadID == undefined) {
                return setUserNotDownloading(userID)
                .then(function() {
                    return resolve(false);
                });
            } else {
                if (downloadID == "false") {
                    return resolve(false);
                } else {
                    return resolve(downloadID);
                }
            }
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// getClipInfo
// Returns some information on the current clip
module.exports.getClipInfo = function(username, pmsID, email, password, downloadID) {
    var userID = "pms_" + pmsID;
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;
            return getClipInfoHelper(userID, pmsID, downloadID);
        })
        .then(function(info) {
            return resolve(info);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// getClipVideo
// Checks to see if the video for the clip has been upload to S3 yet. This endpoint will be polled every second.
module.exports.getClipVideo = function(username, pmsID, email, password, downloadID) {
    var userID = "pms_" + pmsID;
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;
            return getClipVideoHelper(userID, downloadID);
        })
        .then(function(result) {
            return resolve(result);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// setClipExclusive
// Sets a clip as exclusive or not, depending on value passed
module.exports.setClipExclusive = function(username, pmsID, email, password, downloadID, exclusive) {
    var userID = "pms_" + pmsID;
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;
            return dbController.setDownloadExclusive(userID, downloadID, exclusive);
        })
        .then(function() {
            return resolve(true);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// setClipTitle
// Sets a clip title if they are authorized to
module.exports.setClipTitle = function(username, pmsID, email, password, downloadID, title) {
    var userID = "pms_" + pmsID;
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;
            return dbController.setTitle(userID, pmsID, downloadID, title);
        })
        .then(function() {
            return resolve(true);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// setClipDescription
// Sets a clip description if they are authorized to
module.exports.setClipDescription = function(username, pmsID, email, password, downloadID, description) {
    var userID = "pms_" + pmsID;
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;
            return dbController.setDescription(userID, pmsID, downloadID, description);
        })
        .then(function() {
            return resolve(true);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// setClipDeleted
// Sets a clip as deleted in the database. A cron will pick this up and delete it 24 hours later
module.exports.setClipDeleted = function(username, pmsID, email, password, downloadID, deleteVal) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;

            if (deleteVal) { // Delete it
                return dbController.setClipAsDeleted(userID, pmsID, downloadID);
            } else { // Un delete it
                return dbController.setClipAsUnDeleted(userID, pmsID, downloadID);
            }
        })
        .then(function() {
            return resolve(true);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// setClipCustomOption
// Sets a custom clip option if they are authorized to. The option name and option value are validated for integrity.
module.exports.setClipCustomOption = function(username, pmsID, email, password, downloadID, optionName, optionValue) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            return customOptionHandler(id, downloadID, optionName, optionValue);
        })
        .then(function() {
            return resolve(true);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// pollADPhase
// Endpoint that gets polled while the clip is in the 'preparing' state. Just returns the download
// state and created at.
module.exports.pollADPhase = function(username, pmsID, email, password, downloadID) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            return dbController.getDownload(id, downloadID);
        })
        .then(function(download) {
            if (download == undefined) {
                return reject(Errors.clipDoesntExist());
            } else {
                return resolve({
                    download_id: downloadID,
                    state: download.state,
                    created_at: download.created_at
                });
            }
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// uploadThumbnailImage
// Uploads an image to s3, then depending on what the scope is updates the db.
module.exports.uploadThumbnailImage = function(username, pmsID, email, password, extraData, imgB64, scope) {
    var userID = pmsID;
    var thumbnailImg = null;
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;
            return uploadImageToS3(userID, imgB64);
        })
        .then(function(imgURL) {
            thumbnailImg = imgURL;
            return addThumbnailBasedOnScope(userID, pmsID, scope, extraData, imgURL);
        })
        .then(function() {
            return resolve(thumbnailImg);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// swapClipOrder
// Swaps the order number of two clips
module.exports.swapClipOrder = function(username, pmsID, email, password, downloadID1, downloadID2) {
    var userID = pmsID;
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;
            return dbController.swapClipOrderNumber(userID, downloadID1, downloadID2);
        })
        .then(function() {
            return resolve(true);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// pollProcessingTime
// Endpoint that will get polled for an updated processing time for the video.
// This is essentially just a wrapper over the getClipInfo helper, that removes unneccessary data + updates the db if a processing time is set.
// This has no real latency constraints so no harm in calling getClipInfoHelper.
module.exports.pollProcessingTime = function(username, pmsID, email, password, downloadID) {
    var userID = pmsID;
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            userID = id;
            return _getClipInfoHelper(userID, pmsID, downloadID, true);
        })
        .then(function(clipInfo) {
            var allowedStates = ["currently_processing", "still_currently_clipping", "clip_deleted"];

            var savedVal = null;
            var returnedVal = "wont_be_processed";
            if (clipInfo.processing_start_estimate == null) {
                savedVal = null;
                returnedVal = "wont_be_processed";
            } else if (allowedStates.indexOf(clipInfo.processing_start_estimate) >= 0) {
                savedVal = null;
                returnedVal = clipInfo.processing_start_estimate;
            } else if (clipInfo.processing_start_estimate != null && clipInfo.processing_start_estimate != "") {
                // This is an actual expected processing time stamp
                // Update it in the DB so that we don't have to do extra work in the next call to get clip info

                savedVal = new Date(clipInfo.processing_start_estimate).toString();
                returnedVal = clipInfo.processing_start_estimate;
            } else {
                // Shouldn't really happen but say it won't be processed in this case
                savedVal = null;
                returnedVal = clipInfo.processing_start_estimate;
            }

            return dbController.setDownloadProcessingEstimate(downloadID, savedVal)
            .then(function() {
                return resolve(returnedVal);
            })
            .catch(function(err) {
                return reject(err);
            });
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// --------------------------------------------
// Exported compartmentalized functions above.
// --------------------------------------------
// Helper functions below.
// --------------------------------------------

function _uploadFileToS3(file) {
    return new Promise(function(resolve, reject) {
        var cmd = "aws s3 cp " + file + " s3://" + Attr.AWS_S3_BUCKET_NAME + Attr.AWS_S3_THUMBNAIL_PATH + " --acl public-read";
        cLogger.info("Running CMD: " + cmd);
        return shell.exec(cmd, function(code, stdout, stderr) {
            if (code != 0) {
                return reject(stderr);
            }

            return resolve();
        });
    });
}

function deleteThumbnailFromS3(image) {
    return new Promise(function(resolve, reject) {
        var imageSplit = image.split("/");
        var fileNameActual = imageSplit[imageSplit.length - 1];

        var cmd = "aws s3 rm s3://" + Attr.AWS_S3_BUCKET_NAME + Attr.AWS_S3_THUMBNAIL_PATH + fileNameActual;
        cLogger.info("Running cmd: " + cmd);
        return shell.exec(cmd, function(code, stdout, stderr) {
            if (code != 0) {
                // If this errors just report to sentry and continue
                ErrorHelper.scopeConfigure("users.deleteThumbnailFromS3", {error: stderr});
                ErrorHelper.emitSimpleError(new Error("Failed to delete from s3."));
            }

            return resolve();
        });
    });
}

function addThumbnailBasedOnScope(userID, pmsID, scope, extraData, imageLink) {
    return new Promise(function(resolve, reject) {
        switch (scope) {
            case "default-thumbnail":
                // The extra data here is gameName

                if (!validThumbnailItem({gameName: extraData, image: imageLink})) {
                    return reject(Errors.invalidThumbnail());
                }

                // Remove the cached settings since this is a default thumbnail change
                var redisKey = userDefaultsOverviewKey + (pmsID + "");
                redis.del(redisKey);

                // Only one image can be uploaded at a time in this route.
                return dbController.addThumbnail(pmsID, extraData, imageLink, false, null)
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "custom-thumbnail":
                // The extra data here is downloadID
                
                if (extraData == null || extraData == "") {
                    return reject(Errors.clipDoesntExist());
                }

                return dbController.insertCustomOption(userID, extraData, "custom_thumbnail", imageLink)
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            default:
                return reject(Errors.invalidScope());
        }
    });
}

function uploadImageToS3(userID, imgB64) {
    return new Promise(function(resolve, reject) {
        var currDate = new Date();
        var filePath = ORIGIN_PATH + "tmp_img_files/";
        var fileName = "user_" + userID + "_timestamp_" + currDate.getTime();

        return base64Img.img(imgB64, filePath, fileName, function(err, filepath) {
            if (err) {
                return reject(err);
            }

            var filepathSplit = filepath.split("/");
            var fileNameInCDN = "https://d2b3tzzd3kh620.cloudfront.net/" + Attr.AWS_S3_THUMBNAIL_PATH + filepathSplit[filepathSplit.length - 1];

            return _uploadFileToS3(filepath)
            .then(function() {

                // Delete the local file since its not uploaded to S3
                var rmCMD = "rm " + filepath;
                cLogger.info("Running CMD: " + rmCMD);
                return shell.exec(rmCMD, function(code, stdout, stderr) {
                    if (code != 0) {
                        return reject(stderr);
                    }

                    return resolve(fileNameInCDN);
                });
            })
            .catch(function(err) {
                return reject(err);
            });
        });
    });
}

function updateUserHelper(userData) {
    return new Promise(function(resolve, reject) {
        let oldID = userData['old_user[data][ID]'];
        let oldUsername = userData['old_user[data][user_login]'];
        let oldPassword = userData['old_user[data][user_pass]'];
        let oldEmail = userData['old_user[data][user_email]'];

        // Need to have all the old information
        if (oldID == "" || oldUsername == "" || oldPassword == "" || oldEmail == "") {
            return reject(Errors.notAuthorized());
        }

        let newID = userData['new_user[data][ID]'];
        let newUsername = userData['new_user[data][user_login]'];
        let newPassword = userData['new_user[data][user_pass]'];
        let newEmail = userData['new_user[data][user_email]'];

        // Need to have all of the new information
        if (newID == "" || newUsername == "" || newPassword == "" || newEmail == "") {
            return reject(Errors.notAuthorized());
        }

        // Old ID and username must match with the new ones. These you can't change.
        if (newID != oldID || newUsername != oldUsername) {
            return reject(Errors.notAuthorized());
        }

        // Make sure the old data is a valid user
        return validateUserAllowEmptyPassword(oldUsername, oldID, oldEmail, oldPassword)
        .then(function(id) {
            return dbController.updateUser(oldUsername, oldID, newEmail, newPassword);
        })
        .then(function() {
            return resolve();
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

function checkIfInRedis(key) {
    return new Promise(function(resolve, reject) {
        return redis.get(key, function(err, reply) {
            if (!err && reply != null) {
                return resolve(reply.toString());
            } else {
                return resolve(undefined);
            }
        });
    });
}

function validateClipGame(twitch_link) {
    return new Promise(function(resolve, reject) {
        return Hijacker.getClipGame(twitch_link)
        .then(function(gameName) {
            return resolve(gameName);
        })
        .catch(function(err) {
            return resolve(undefined);
        });
    });
}

function userAlreadyClipping(internalID) {
    return new Promise(function(resolve, reject) {
        return checkIfInRedis(userClippingKey + internalID)
        .then(function(reply) {
            return resolve(reply);
        });
    });
}

function setUserDownloading(internalID, downloadID) {
    if (internalID == undefined || downloadID == undefined) {
        return;
    }

    return new Promise(function(resolve, reject) {
        var multi = redis.multi();
        multi.set((userClippingKey + internalID), downloadID, "EX", userClippingTTL);
        multi.exec(function (err, replies) {
            return resolve();
        });
    });
}

function setUserNotDownloading(internalID) {
    return new Promise(function(resolve, reject) {
        var multi = redis.multi();
        multi.set((userClippingKey + internalID), "false", "EX", userClippingTTL);
        multi.exec(function (err, replies) {
            return resolve();
        });
    });
}

function removeUserDownloadingNotification(pmsID) {
    return new Promise(function(resolve, reject) {
        return dbController.seenNotification(pmsID, downloadingClipNotification)
        .then(function() {
            return resolve();
        })
        .catch(function(err) {
            // Not worth it to error here, just log to sentry
            ErrorHelper.scopeConfigure("users.removeUserDownloadingNotification", {
                pms_user_id: pmsID
            });
            ErrorHelper.emitSimpleError(err);

            return resolve();
        });
    });
}

function userHasTokenHelper(userID) {
    var userHasTokenRedisKey = "user_" + userID + "_has_youtube_token";
    var userHasTokenRedisTTL = defaultTTL;

    return new Promise(function(resolve, reject) {
        return checkIfInRedis(userHasTokenRedisKey)
        .then(function(reply) {
            if (reply != undefined && reply == "true") {
                return resolve(true);
            } else {
                return dbController.hasUserToken(userID);
            }
        })
        .then(function(userToken) {
            if (userToken == undefined) {
                return resolve(false);
            }
            redis.set(userHasTokenRedisKey, "true", "EX", userHasTokenRedisTTL);
            return resolve(true);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

function setUserDownloadingNotification(pmsID, downloadID) {
    var content = {download_id: downloadID};
    var contentStr = JSON.stringify(content);

    return new Promise(function(resolve, reject) {
        return dbController.setNotificationsSeen(pmsID, clipFlowNotifications)
        .then(function() {
            return dbController.createDownloadNotification(pmsID, contentStr);
        })
        .then(function() {
            return resolve();
        })
        .catch(function(err) {
            // Not worth it to error here, just log to sentry
            ErrorHelper.scopeConfigure("users.setUserDownloadingNotification", {
                pms_user_id: pmsID,
                download_id: downloadID
            });
            ErrorHelper.emitSimpleError(err);

            return resolve();
        });
    });
}

function getClipVideoHelper(userID, downloadID) {
    let clipVideoKey = "redis_clip_video_" + downloadID;
    return new Promise(function(resolve, reject) {
        return checkIfInRedis(clipVideoKey)
        .then(function(reply) {
            if (reply != undefined && reply != "false") {
                return resolve(reply);
            } else if (reply == "false") {
                return resolve(undefined);
            } else {
                return dbController.getDownload(userID, downloadID);
            }
        })
        .then(function(downloadObj) {
            if (downloadObj == undefined) {
                return reject(Errors.clipDoesntExist());
            } else {
                if (downloadObj.downloaded_file == null || !downloadObj.downloaded_file.startsWith("https://d2b3tzzd3kh620.cloudfront.net")) {
                    redis.set(clipVideoKey, "false", "EX", clipVideoTTL);
                    return resolve(undefined);
                } else if (downloadObj.downloaded_file.startsWith("https://d2b3tzzd3kh620.cloudfront.net")) {
                    redis.set(clipVideoKey, downloadObj.downloaded_file, "EX", clipVideoTTL);
                    return resolve(downloadObj.downloaded_file);
                } else {
                    ErrorHelper.scopeConfigureWID("users.getClipVideoHelper", {
                        download_id: downloadID,
                        downloadObj: downloadObj
                    }, (userID + ""));
                    ErrorHelper.emitSimpleError(new Error("The download object was in a state we cannot work with!"));
                    redis.set(clipVideoKey, "false", "EX", clipVideoTTL);
                    return resolve(undefined);
                }
            }
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

function getClipYoutubeSettings(userID, pmsID, downloadID, gameName) {
    var info = {};
    return new Promise(function(resolve, reject) {
        return dbController.getYoutubeVideoSettings(userID, pmsID, downloadID)
        .then(function(results) {
            info = results;
            return dbController.getAllTags(pmsID, userID, downloadID, gameName);
        })
        .then(function(tags) {

            // Remove all the unneccessary information on the tags. Only include the tag name
            var tagsSimple = [];
            for (var i = 0; i < tags.length; i++) {
                tagsSimple.push(tags[i].tag);
            }

            info.tags = tagsSimple;
            return dbController.getCustomTags(userID, downloadID);
        })
        .then(function(customVidTags) {

            // Remove all the unneccessary information on the tags. Only include the tag name
            for (var i = 0; i < customVidTags.length; i++) {
                info.tags.push(customVidTags[i].option_value);
            }

            return dbController.getGameThumbnail(pmsID, gameName);
        })
        .then(function(gameThumbnail) {
            info.thumbnails = {
                game: null, default_image: null, specific_image: null
            };

            // Include the game thumbnail if it exists
            if (gameThumbnail != null) {
                info.thumbnails.game = gameThumbnail.game;
                info.thumbnails.default_image = gameThumbnail.image_name;
            }

            return dbController.getCustomClipThumbnail(userID, downloadID);
        })
        .then(function(customThumbnail) {
            info.thumbnails.specific_image = customThumbnail;

            return resolve(info);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

function _legacyClipSecondsCalculator(createdAt, updatedAt) {
    var tmpCreatedAt = new Date(createdAt);
    var tmpUpdatedAt = new Date(updatedAt);
    var legacyLength = Math.round(Math.abs(((tmpUpdatedAt.getTime() - tmpCreatedAt.getTime()) / 1000)));
    return legacyLength;
}

function predictProcessingStartTime(startedDateTime) {
    startedDateTime.setSeconds(0); // Seconds are irrelevant here

    // Step 1 add the minimum delay time to the date
    startedDateTime.setMinutes(startedDateTime.getMinutes() + Attr.MINIMUM_VIDEO_PROCESSING_DELAY_MINUTES);

    // Step 2 get minutes to subtract to be divisible by the minimum video processing delay 
    // This is done since a cron will be running on MINIMUM_VIDEO_PROCESSING_DELAY_MINUTES
    var subtractMinutes = startedDateTime.getMinutes() % Attr.MINIMUM_VIDEO_PROCESSING_DELAY_MINUTES;

    // Step 3 update the minutes once again to be the Attr.MINIMUM_VIDEO_PROCESSING_DELAY_MINUTES interval above the current one
    startedDateTime.setMinutes((startedDateTime.getMinutes() - subtractMinutes) + Attr.MINIMUM_VIDEO_PROCESSING_DELAY_MINUTES);

    // Step 4 Make sure that this is in the future.
    // If the expected start time is already passed, something weird has occured so change it to be in the future.
    var currentDateTime = new Date();
    if (startedDateTime < currentDateTime) {
        return predictProcessingStartTime(currentDateTime);
    } else {
        return startedDateTime;
    }
}

function _getClipInfoHelper(userID, pmsID, downloadID, fullCycle) {
    var info = {};
    var gameName = null;
    var totalVideoLength = 0;
    var currentClipStoppedClipping = null;
    var processingEstimateDone = null;
    return new Promise(function(resolve, reject) {
        return dbController.getDownload(userID, downloadID)
        .then(function(results) {
            if (results == undefined) {
                return reject(Errors.clipDoesntExist());
            } else {
                info = results;
                gameName = info.game;

                if (info.clip_stopped_downloading != null) {
                    currentClipStoppedClipping = new Date(info.clip_stopped_downloading);
                } else {
                    // Legacy should not be used if possible...
                    cLogger.info("The clips stopped downloading date isn't set yet, or this is a legacy clip. Using created at for now.");
                    currentClipStoppedClipping = new Date(info.created_at);
                }

                if (info.expected_processing_time != null) {
                    processingEstimateDone = info.expected_processing_time;
                }

                // Delete some info we don't want to share with the frontend
                delete info.user_id;
                delete info.id;

                // Only include the downloaded file link if its already stored in S3
                if (info.downloaded_file == null || !info.downloaded_file.startsWith(cdnURL)) {
                    delete info.downloaded_file;
                }

                // Add this clip length to the sum of all clips length. Only if this hasn't been calculated already.
                if (processingEstimateDone == null || fullCycle == true) {
                    if (info.clip_seconds != null && info.clip_seconds > 0) { // Already done, and seconds added to DB.
                        totalVideoLength += info.clip_seconds;
                    } else if (info.created_at != null && info.updated_at != null && info.state != "preparing" && info.state != "started") { // Legacy. Slower process + not as accurate, should be avoided if possible. However not too big of a deal.
                        totalVideoLength += _legacyClipSecondsCalculator(info.created_at, info.updated_at);
                    } else if (info.created_at != null && info.updated_at == null) { // Make a best guess since the clip is still running.
                        var currentDateTime = new Date();
                        totalVideoLength += _legacyClipSecondsCalculator(info.created_at, currentDateTime.toString());
                    }
                }

                return dbController.getVideosToBeCombined(userID, downloadID, gameName);
            }
        })
        .then(function(toCombineVids) {

            // Remove some info we don't want to share
            for (var i = 0; i < toCombineVids.length; i++) {
                delete toCombineVids[i].user_id;

                // Extract the clip seconds from all of the clips
                if (processingEstimateDone == null || fullCycle == true) {
                    if (toCombineVids[i].clip_seconds != null && toCombineVids[i].clip_seconds > 0) {
                        totalVideoLength += toCombineVids[i].clip_seconds;
                    } else if (toCombineVids[i].created_at != null && toCombineVids[i].updated_at != null) { // Legacy. Slower process + not as accurate, should be avoided if possible. However not too big of a deal.
                        totalVideoLength += _legacyClipSecondsCalculator(toCombineVids[i].created_at, toCombineVids[i].updated_at);
                    }
                }

                // Only include the downloaded file link if its already stored in S3
                if (toCombineVids[i].downloaded_file == null || !toCombineVids[i].downloaded_file.startsWith(cdnURL)) {
                    delete toCombineVids[i].downloaded_file;
                }
            }

            // Sort these clips by the order number
            toCombineVids.sort(function(a, b) {
                return a.order_number - b.order_number;
            });
            info.videos_to_combine = toCombineVids;

            return getClipYoutubeSettings(userID, pmsID, downloadID, gameName);
        })
        .then(function(ytSettings) {
            info.youtube_settings = ytSettings;

            var minimumVideoLengthSeconds = (parseInt(info.youtube_settings.minimum_video_length) * 60);
            if (info.state == "preparing" || info.state == "started") {
                info.processing_start_estimate = "still_currently_clipping";
            } else if (info.state == "processing") {
                info.processing_start_estimate = "currently_processing";
            } else if (info.state == "deleted-soon" || info.state == "deleted") {
                info.processing_start_estimate = "clip_deleted";
            } else if (processingEstimateDone != null && fullCycle == false) {
                info.processing_start_estimate = processingEstimateDone;
            } else if (info.youtube_settings.force_video_processing == "true" || info.youtube_settings.force_video_processing == true) {
                info.processing_start_estimate = (predictProcessingStartTime(currentClipStoppedClipping)).toString();
            } else if (totalVideoLength >= minimumVideoLengthSeconds && processingEstimateDone == null) { // If the total video length is already greater than the minimum video length, then mark this with a time the video will start processing
                info.processing_start_estimate = (predictProcessingStartTime(currentClipStoppedClipping)).toString();
            } else {
                info.processing_start_estimate = null; // It won't be processed yet since it is still below the minimum video length
            }

            return resolve(info);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

function getClipInfoHelper(userID, pmsID, downloadID) {
    return _getClipInfoHelper(userID, pmsID, downloadID, false);
}

function customCategory(userID, downloadID, optionValue) {
    return new Promise(function(resolve, reject) {
        var validCategory = isValidCategory(optionValue);

        if (!validCategory) {
            return reject(Errors.invalidCategory());
        } else {
            return dbController.addCustomOption(userID, downloadID, "custom_category", optionValue)
            .then(function() {
                return resolve();
            })
            .catch(function(err) {
                return reject(err);
            });
        }
    });
}

function customLanguage(userID, downloadID, optionValue) {
    return new Promise(function(resolve, reject) {
        var vLanguage = validLanguage(optionValue);

        if (!vLanguage) {
            return reject(Errors.invalidLanguage());
        } else {
            return dbController.addCustomOption(userID, downloadID, "custom_language", optionValue)
            .then(function() {
                return resolve();
            })
            .catch(function(err) {
                return reject(err);
            });
        }
    });
}

function customThumbnail(userID, downloadID, optionValue) {
    return new Promise(function(resolve, reject) {
        var validImageTypes = [".png", ".jpg", ".jpeg", ".webp"];
        var validImageType = false;

        for (var i = 0; i < validImageTypes.length; i++) {
            if (optionValue.endsWith(validImageTypes[i])) {
                validImageType = true;
            }
        }

        // It can also be the value 'none'
        if (!validImageType && optionValue == "none") {
            validImageType = true;
        }

        if (!validImageType) {
            return reject(Errors.invalidImageType());
        } else {
            return dbController.addCustomOption(userID, downloadID, "custom_thumbnail", optionValue)
            .then(function() {
                return resolve();
            })
            .catch(function(err) {
                return reject(err);
            });
        }
    });
}

function deleteVideoTag(userID, downloadID, optionValue) {
    return new Promise(function(resolve, reject) {
        return dbController.customTagExists(userID, downloadID, optionValue)
        .then(function(exists) {
            if (exists) {
                return dbController.deleteCustomOption(userID, downloadID, "custom_tag", optionValue);
            } else {
                return dbController.insertCustomOption(userID, downloadID, "custom_tag_deletion", optionValue);
            }
        })
        .then(function() {
            return resolve();
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

function forceVideoProcessing(userID, downloadID, optionValue) {
    return new Promise(function(resolve, reject) {
        var sanitizedVal = null;
        if (optionValue == "true" || optionValue == true) {
            sanitizedVal = true;
        } else if (optionValue == "false" || optionValue == false) {
            sanitizedVal = false;
        }

        if (sanitizedVal == true || sanitizedVal == false) {
            return dbController.addCustomOption(userID, downloadID, "force_processing", sanitizedVal + "")
            .then(function() {
                return resolve();
            })
            .catch(function(err) {
                return reject(err);
            });
        } else {
            return reject(Errors.invalidCustomValue());
        }
    });
}

function customOptionHandler(userID, downloadID, optionName, optionValue) {
    return new Promise(function(resolve, reject) {
        switch (optionName) {
            case "custom_thumbnail":
                return customThumbnail(userID, downloadID, optionValue)
                .then(function() {
                    return resolve();
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "custom_category":
                return customCategory(userID, downloadID, optionValue)
                .then(function() {
                    return resolve();
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "custom_language":
                return customLanguage(userID, downloadID, optionValue)
                .then(function() {
                    return resolve();
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "custom_playlist":
                // No validation here, either the user gets it right or wrong. Dont care.
                return dbController.addCustomOption(userID, downloadID, "custom_playlist", optionValue)
                .then(function() {
                    return resolve();
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "custom_tags":
                // No validation here its just free text. leave it up to the user.
                return dbController.insertCustomOption(userID, downloadID, "custom_tag", optionValue)
                .then(function() {
                    return resolve();
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "remove_tags":
                return deleteVideoTag(userID, downloadID, optionValue)
                .then(function() {
                    return resolve();
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "remove_combined_clip":
                // No validation needed, if the user does something wrong its on them.
                return dbController.insertCustomOption(userID, downloadID, "custom_clip_deletion", optionValue)
                .then(function() {
                    return resolve();
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "force_video_processing":
                return forceVideoProcessing(userID, downloadID, optionValue)
                .then(function() {
                    return resolve();
                })
                .catch(function(err) {
                    return reject(err);
                });
            default:
                return reject(Errors.invalidCustomOption());
        }
    });
}

function getSettingsHelper(pmsID, scope) {
    return new Promise(function(resolve, reject) {
        switch (scope) {
            case "overview":
                var redisKey = userDefaultsOverviewKey + (pmsID + "");

                return checkIfInRedis(redisKey)
                .then(function(value) {
                    if (value != undefined) {
                        return resolve(JSON.parse(value));
                    } else {
                        return dbController.settingsOverview(pmsID)
                        .then(function(results) {
                            var redisContent = JSON.stringify(results);
                            redis.set(redisKey, redisContent, "EX", userDefaultsOverviewTTL);
                            return resolve(results);
                        })
                        .catch(function(err) {
                            return reject(err);
                        });
                    }
                });
            case "minimum-length":
                return reject(Errors.shouldHaveObtainedFromOverview());
            case "maximum-length":
                return reject(Errors.shouldHaveObtainedFromOverview());
            case "game-playlists":
                return dbController.getPlaylists(pmsID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-comments":
                return dbController.getComments(pmsID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-like":
                return reject(Errors.shouldHaveObtainedFromOverview());
            case "default-category":
                return reject(Errors.shouldHaveObtainedFromOverview());
            case "default-signature":
                return dbController.getSignatures(pmsID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-tags":
                return dbController.getTags(pmsID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-language":
                return reject(Errors.shouldHaveObtainedFromOverview());
            case "default-thumbnail":
                return dbController.getThumbnails(pmsID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            default:
                return reject(Errors.invalidScope());
        }
    });
}

function updateDefaultSetting(pmsID, settingName, settingJSON) {
    return new Promise(function(resolve, reject) {
        var redisKey = userDefaultsOverviewKey + (pmsID + "");
        // Always clear this if they update any settings
        redis.del(redisKey);

        switch (settingName) {
            case "minimum-length":
                var setting = JSON.parse(settingJSON);
                
                if (parseInt(setting) < 0) {
                    setting = 0;
                }
                if (parseInt(setting) > 24) {
                    setting = 24;
                }

                return dbController.updateSimpleSetting(pmsID, settingName, setting + "")
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "maximum-length":
                var setting = JSON.parse(settingJSON);
                
                if (parseInt(setting) < 3) {
                    setting = 3;
                }
                if (parseInt(setting) > 25) {
                    setting = 25;
                }

                return dbController.updateSimpleSetting(pmsID, settingName, setting + "")
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "game-playlists":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next1() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].playlistID == undefined || setting[count].playlistID == "") {
                        return reject(Errors.invalidPlaylist());
                    }

                    return dbController.addPlaylist(pmsID, setting[count].gameName, setting[count].playlistID)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next1();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next1();
            case "remove-game-playlists":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next2() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].playlistID == undefined || setting[count].playlistID == "") {
                        return reject(Errors.invalidPlaylist());
                    }

                    return dbController.deletePlaylist(pmsID, setting[count].gameName, setting[count].playlistID)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next2();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next2();
            case "default-comments":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next3() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].comment == undefined || setting[count].comment == "") {
                        return reject(Errors.invalidComment());
                    }

                    return dbController.addComment(pmsID, setting[count].gameName, setting[count].comment)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next3();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next3();
            case "remove-default-comments":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next4() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].comment == undefined || setting[count].comment == "") {
                        return reject(Errors.invalidComment());
                    }

                    return dbController.removeComment(pmsID, setting[count].gameName, setting[count].comment)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next4();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next4();
            case "default-like":
                var setting = JSON.parse(settingJSON);
                
                if (setting != true && setting != false && setting != "true" && setting != "false") {
                    setting = true;
                }

                return dbController.updateSimpleSetting(pmsID, settingName, setting + "")
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-category":
                var setting = settingJSON;
                if (!isValidCategory(setting)) {
                    return reject(Errors.invalidCategory());
                }
                
                return dbController.updateSimpleSetting(pmsID, settingName, setting + "")
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-signature":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next5() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].signature == undefined || setting[count].signature == "") {
                        return reject(Errors.invalidSignature());
                    }

                    return dbController.addSignature(pmsID, setting[count].gameName, setting[count].signature)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next5();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next5();
            case "remove-default-signature":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next6() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].signature == undefined || setting[count].signature == "") {
                        return reject(Errors.invalidSignature());
                    }

                    return dbController.removeSignature(pmsID, setting[count].gameName, setting[count].signature)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next6();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next6();
            case "default-tags":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next7() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].tag == undefined || setting[count].tag == "") {
                        return reject(Errors.invalidTag());
                    }

                    return dbController.addTag(pmsID, setting[count].gameName, setting[count].tag)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next7();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next7();
            case "remove-default-tags":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next8() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].tag == undefined || setting[count].tag == "") {
                        return reject(Errors.invalidTag());
                    }

                    return dbController.removeTag(pmsID, setting[count].gameName, setting[count].tag)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next8();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next8();
            case "default-language":
                var setting = settingJSON;
                if (!validLanguage(setting)) {
                    return reject(Errors.invalidLanguage());
                }

                return dbController.updateSimpleSetting(pmsID, settingName, setting + "")
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-thumbnail":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                if (!validThumbnailItem(setting[0])) {
                    return reject(Errors.invalidThumbnail());
                }

                // This is the preliminary work towards unique thumbnail to video images.
                var hijacked = false;
                var hijackedName = null; // If this exists it should be the download ID so we can match it with a unique video
                if (setting[0].hijacked == true && setting[0].hijacked_name != undefined && setting[0].hijacked_name != "") {
                    hijacked = true;
                    hijackedName = setting[0].hijacked_name;
                }

                // Only one image can be uploaded at a time in this route.
                return dbController.addThumbnail(pmsID, setting[0].gameName, setting[0].image, hijacked, hijackedName)
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "remove-default-thumbnail":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                if (!validThumbnailItems(setting)) {
                    return reject(Errors.invalidThumbnail());
                }

                // This does NOT care about anything except for image_name & pms_user_id, this is somewhat dangerous but intended.
                var count = 0;
                function next9() {
                    return dbController.deleteThumbnail(pmsID, setting[count].gameName, setting[count].image)
                    .then(function() {
                        return deleteThumbnailFromS3(setting[count].image)
                        .then(function() {
                            count++;
                            if (count < setting.length) {
                                return next9();
                            } else {
                                return resolve(true);
                            }
                        })
                        .catch(function(err) {
                            return reject(err);
                        });
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next9();
            default:
                return reject(Errors.invalidSetting());
        }
    });
}

function isValidCategory(item) {
    var categories = [
        2, // - Autos & Vehicles
        1, // -  Film & Animation
        10, // - Music
        15, // - Pets & Animals
        17, // - Sports
        18, // - Short Movies
        19, // - Travel & Events
        20, // - Gaming
        21, // - Videoblogging
        22, // - People & Blogs
        23, // - Comedy
        24, // - Entertainment
        25, // - News & Politics
        26, // - Howto & Style
        27, // - Education
        28, // - Science & Technology
        29, // - Nonprofits & Activism
        30, // - Movies
        31, // - Anime/Animation
        32, // - Action/Adventure
        33, // - Classics
        34, // - Comedy
        35, // - Documentary
        36, // - Drama
        37, // - Family
        38, // - Foreign
        39, // - Horror
        40, // - Sci-Fi/Fantasy
        41, // - Thriller
        42, // - Shorts
        43, // - Shows
        44 // - Trailers
    ];

    try {
        return (categories.indexOf(parseInt(item)) >= 0);
    } catch (e) {
        return false;
    }
}

function validThumbnailItems(items) {
    for (var i = 0; i < items.length; i++) {
        if (!validThumbnailItem(items[i])) {
            return false;
        }
    }
    return true;
}

function validThumbnailItem(item) {
    var validGameName = (item.gameName != undefined && item.gameName != "");
    var validImageName = (item.image != undefined && item.image != "");

    return validGameName && validImageName;
}

function validLanguage(item) {
    var languages = [
    "af", "az", "id", "ms", "bs", "ca", "cs", "da", "de", "et", "en-GB", "en", "es", "es-419", 
    "es-US", "eu", "fil", "fr", "fr-CA", "gl", "hr", "zu", "is", "it", "sw", "lv", "lt", "hu", 
    "nl", "no", "uz", "pl", "pt-PT", "pt", "ro", "sq", "sk", "sl", "sr-Latn", "fi", "sv", "vi", 
    "tr", "be", "bg", "ky", "kk", "mk", "mn", "ru", "sr", "uk", "el", "hy", "iw", "ur", "ar", 
    "fa", "ne", "mr", "hi", "bn", "pa", "gu", "ta", "te", "kn", "ml", "si", "th", "lo", "my", 
    "ka", "am", "km", "zh-CN", "zh-TW", "zh-HK", "ja", "ko"];

    return (languages.indexOf(item) >= 0);
}

function getCurrentRouteNotifications(ID, currentRoute) {
    return new Promise(function(resolve, reject) {
        switch(currentRoute) {
            case "dashboard":
                return dbController.getDashboardNotifications(ID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "videos":
                return dbController.getVideosNotifications(ID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "account":
                return dbController.getAccountNotifications(ID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "defaults":
                return dbController.getDefaultsNotifications(ID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            default:
                return resolve([]);
        }
    });
}

function validateUserAndGetID(username, ID, email, password) {
    var redisKey = validUserRedisKey + username + "_" + ID + "_" + email + "_" + password;

	return new Promise(function(resolve, reject) {

		// At some point we should be checking redis here instead. This will be one of the most used functions.
        return checkIfInRedis(redisKey)
        .then(function(reply) {
            if (reply != undefined) {
                return resolve(reply);
            } else {
                return dbController.doesUserExist(username, ID, email, password);
            }
        })
        .then(function(user) {
            // If the user doesn't exist, reject with a not authorized.
            if (user == undefined) {
                return reject(Errors.notAuthorized());
            }

            // The user exists, return the id of the user.
            redis.set(redisKey, (user.id + ""), "EX", validUserRedisTTL);
            return resolve(user.id);
        })
        .catch(function(err) {
            return reject(err);
        });
	});
}

function validateUserAllowEmptyPassword(username, ID, email, password) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, ID, email, password)
        .then(function(id) {
            return resolve(id);
        })
        .catch(function(err) {
            return dbController.doesUserExist(username, ID, email, "tmp_password")
            .then(function(user) {
                if (user == undefined) {
                    return reject(Errors.notAuthorized());
                }

                return dbController.updateUserPasswordPlaceboState(username, ID, email, password)
                .then(function() {
                    return resolve();
                })
                .catch(function(err) {
                    return reject(err);
                })
            })
            .catch(function(err) {
                return reject(err);
            });
        });
    });
}
