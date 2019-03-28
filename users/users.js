var Promise = require('bluebird');
var cLogger = require('color-log');
var dbController = require('../controller/db');
var OAuthFlow = require('../oauth/oauth_flow');
var Hijacker = require('../hijacker/hijacker');
var Worker = require('../worker/worker_producer');
var ErrorHelper = require('../errors/errors');

// --------------------------------------------
// Constants below.
// --------------------------------------------

// The CDN URL
const cdnURL = "https://d2b3tzzd3kh620.cloudfront.net";

const downloadingClipNotification = "currently-clipping";
// The names of all of the clip flow notifications, this is used to clear when adding a new one.
const clipFlowNotifications = [downloadingClipNotification];

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

// createUser
// Handles the create user endpoint, this endpoint will either create a new user or just update their contents.
module.exports.createUser = function(username, ID, email, password, payments, subs, currentRoute) {
    var activeSubscriptionNum = -1;

    return new Promise(function(resolve, reject) {
    	return dbController.createOrUpdateUser(username, ID, email, password, payments, subs)
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
    		return dbController.hasUserToken(id);
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
                return reject(alreadyClippingErr());
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
            return getClipInfoHelper(userID, downloadID);
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
            return resolve();
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
                return reject(clipDoesntExist());
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

function getClipInfoHelper(userID, downloadID) {
    var info = {};
    var gameName = null;
    return new Promise(function(resolve, reject) {
        return dbController.getDownload(userID, downloadID)
        .then(function(results) {
            if (results == undefined) {
                return reject(clipDoesntExist());
            } else {
                info = results;
                gameName = info.game;

                // Delete some info we don't want to share with the frontend
                delete info.user_id;
                delete info.id;

                // Only include the downloaded file link if its already stored in S3
                if (info.downloaded_file == null || !info.downloaded_file.startsWith(cdnURL)) {
                    delete info.downloaded_file;
                }

                return dbController.getVideosToBeCombined(userID, downloadID, gameName);
            }
        })
        .then(function(toCombineVids) {

            // Remove some info we don't want to share
            for (var i = 0; i < toCombineVids.length; i++) {
                delete toCombineVids[i].user_id;
                delete toCombineVids[i].id;

                // Only include the downloaded file link if its already stored in S3
                if (toCombineVids[i].downloaded_file == null || !toCombineVids[i].downloaded_file.startsWith(cdnURL)) {
                    delete toCombineVids[i].downloaded_file;
                }
            }

            info.videos_to_combine = toCombineVids;
            return resolve(info);
        })
        .catch(function(err) {
            return reject(err);
        });
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
                return reject(shouldHaveObtainedFromOverview());
            case "maximum-length":
                return reject(shouldHaveObtainedFromOverview());
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
                return reject(shouldHaveObtainedFromOverview());
            case "default-category":
                return reject(shouldHaveObtainedFromOverview());
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
                return reject(shouldHaveObtainedFromOverview());
            case "default-thumbnail":
                return dbController.getThumbnails(pmsID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            default:
                return reject(invalidScope());
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
                
                if (parseInt(setting) < 2) {
                    setting = 2;
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
                        return reject(invalidPlaylist());
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
                        return reject(invalidPlaylist());
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
                        return reject(invalidComment());
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
                        return reject(invalidComment());
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
                    return reject(invalidCategory());
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
                        return reject(invalidSignature());
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
                        return reject(invalidSignature());
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
                        return reject(invalidTag());
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
                        return reject(invalidTag());
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
                    return reject(invalidLanguage());
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
                    return reject(invalidThumbnail());
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
                    return reject(invalidThumbnail());
                }

                // This does NOT care about anything except for image_name & pms_user_id, this is somewhat dangerous but intended.
                var count = 0;
                function next9() {
                    return dbController.deleteThumbnail(pmsID, setting[count].gameName, setting[count].image)
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
                }

                return next9();
            default:
                return reject(invalidSetting());
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

    return (categories.indexOf(parseInt(item)) >= 0);
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
        return checkIfInRedis(validUserRedisKey)
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
                return reject(notAuthorized());
            }

            // The user exists, return the id of the user.
            redis.set(validUserRedisKey, (user.id + ""), "EX", validUserRedisTTL);
            return resolve(user.id);
        })
        .catch(function(err) {
            return reject(err);
        });
	});
}

function clipDoesntExist() {
    var err = new Error("The clip does not exist.");
    err.status = 400;
    return err;
}

function alreadyClippingErr() {
    var err = new Error("The user already has a clip running.");
    err.status = 400;
    return err;
}

function invalidThumbnail() {
    var err = new Error("Invalid Thumbnail.");
    err.status = 400;
    return err;
}

function shouldHaveObtainedFromOverview() {
    var err = new Error("This value should have been obtained from the overview scope.");
    err.status = 400;
    return err;
}

function invalidScope() {
    var err = new Error("Invalid Scope.");
    err.status = 400;
    return err;
}

function invalidTag() {
    var err = new Error("Invalid Signature.");
    err.status = 400;
    return err;
}

function invalidSignature() {
    var err = new Error("Invalid Signature.");
    err.status = 400;
    return err;
}

function invalidComment() {
    var err = new Error("Invalid Comment.");
    err.status = 400;
    return err;
}

function invalidSetting() {
    var err = new Error("Invalid Setting Name.");
    err.status = 400;
    return err;
}

function invalidPlaylist() {
    var err = new Error("Invalid Playlist.");
    err.status = 400;
    return err;
}

function invalidLanguage() {
    var err = new Error("Invalid Language.");
    err.status = 400;
    return err;
}

function invalidCategory() {
    var err = new Error("Invalid Category.");
    err.status = 400;
    return err;
}

function notAuthorized() {
	var err = new Error("Not Authorized.");
	err.status = 403;
	return err;
}
