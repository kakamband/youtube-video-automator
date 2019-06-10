var Promise = require('bluebird');
var cLogger = require('color-log');
var Secrets = require('../config/secrets');
var ErrorHelper = require('../errors/errors');
var Errors = require('../errors/defined_errors');
const stripeProd = require('stripe')(Secrets.STRIPE_PROD_SECRET);
const stripeTest = require('stripe')(Secrets.STRIPE_TEST_SECRET);
var Attr = require('../config/attributes');

const PER_PAGE_ON_VIDEOS_TABLES = 5;

module.exports.alreadyUsed = function(game, id, trackingID) {
	return new Promise(function(resolve, reject) {
		knex('used_content')
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: game.toLowerCase()
	    }))
		.where("vod_id", "=", id)
		.where("tracking_id", "=", trackingID)
		.then(function(results) {
			if (results.length > 0) {
				return resolve(true);
			}
			return resolve(false);
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		})
	});
}

module.exports.finishedDownloading = function(userID, gameName, twitchStream, downloadID, fileLocation) {
	return new Promise(function(resolve, reject) {
		knex('downloads')
		.where("id", "=", downloadID)
		.where("user_id", "=", userID)
		.where("twitch_link", "=", twitchStream)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.update({
			state: "done",
			downloaded_file: fileLocation,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.initDownloadStop = function(userID, twitchLink, downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "=", downloadID)
		.where("user_id", "=", userID)
		//.where("twitch_link", "=", twitchLink) This just leads to errors
		.then(function(results) {
			if (results.length == 0) {
				return reject(new Error("The download doesn't seem to exist..."));
			} else if (results[0].state != "started" && results[0].state != "preparing") {
				return reject(new Error("The download state is not active or preparing, cannot stop. (State: " + results[0].state + ")."));
			} else {
				return knex('downloads')
				.where("id", "=", downloadID)
				.where("user_id", "=", userID)
				.where("twitch_link", "=", twitchLink)
				.update({
					state: "init-stop",
					clip_stopped_downloading: (new Date()).getTime() + "",
					updated_at: new Date() // We can update this here since it will be updated anyways after ~5 seconds. Updating here helps with processing time estimates.
				})
				.then(function(results) {
					return resolve();
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.doesUserExist = function(username, pmsID, email, password) {
	return new Promise(function(resolve, reject) {
		return knex('users')
		.select("id")
		.where('username', '=', username)
		.where('pms_user_id', '=', pmsID)
		.where('email', '=', email)
		.where('password', '=', password)
		.then(function(user) {
			if (user.length > 0) {
				return resolve(user[0]);
			} else {
				return resolve(undefined);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		})
	});
}

module.exports.hasUserToken = function(ID) {
	return new Promise(function(resolve, reject) {
		return knex('user_tokens')
		.where('user_id', '=', ID)
		.then(function(result) {
			if (result.length > 0) {
				return resolve(result[0]);
			} else {
				return resolve(undefined);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.hasNewUserToken = function(ID) {
	return new Promise(function(resolve, reject) {
		return knex('user_tokens')
		.where('user_id', '=', ID)
		.whereRaw("created_at >= (select DATE \'today\')")
		.then(function(result) {
			if (result.length > 0) {
				return resolve(result[0]);
			} else {
				return resolve(undefined);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function _setNotificationsSeen(pmsID, notificationNames) {
	return new Promise(function(resolve, reject) {
		return knex('notifications')
		.where("pms_user_id", "=", pmsID)
		.where("seen", "=", false)
		.whereIn("notification", notificationNames)
		.update({
			seen: true,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.setNotificationsSeen = function(pmsID, notificationNames) {
	return _setNotificationsSeen(pmsID, notificationNames);
}

function seenNotificationHelper(pmsID, notificationName) {
	return new Promise(function(resolve, reject) {
		return knex('notifications')
		.where("pms_user_id", "=", pmsID)
		.where("notification", "=", notificationName)
		.update({
			seen: true,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.seenNotification = function(pmsID, notificationName) {
	return seenNotificationHelper(pmsID, notificationName);
}

function getNotifications(pmsID, notificationNames) {
	return new Promise(function(resolve, reject) {
		return knex('notifications')
		.where("pms_user_id", "=", pmsID)
		.where("seen", "=", false)
		.whereIn("notification", notificationNames)
		.then(function(results) {
			if (results.length == 0) {
				return resolve([]);
			} else {
				for (var i = 0; i < results.length; i++) {
					delete results[i].pms_user_id;
					delete results[i].seen;
					delete results[i].created_at;
					delete results[i].updated_at;
				}

				return resolve(results);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getVideosNotifications = function(pmsID) {
	return getNotifications(pmsID, ["videos-intro", "currently-clipping", "need-title-or-description", "currently-processing", "currently-uploading", "done-uploading"]);
}

module.exports.getDashboardNotifications = function(pmsID) {
	return getNotifications(pmsID, ["dashboard-intro", "need-title-or-description", "currently-processing", "currently-uploading", "done-uploading"]);
}

module.exports.getAccountNotifications = function(pmsID) {
	return getNotifications(pmsID, ["account-intro", "currently-clipping", "need-title-or-description", "currently-processing", "currently-uploading", "done-uploading"]);
}

module.exports.getDefaultsNotifications = function(pmsID) {
	return getNotifications(pmsID, ["defaults-intro", "currently-clipping", "need-title-or-description", "currently-processing", "currently-uploading", "done-uploading"]);
}

module.exports.settingsOverview = function(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex
		.select(knex.raw('(select value from simple_default where pms_user_id=? AND setting_name=\'minimum-length\') as min_vid_length', [pmsID]))
		.select(knex.raw('(select value from simple_default where pms_user_id=? AND setting_name=\'maximum-length\') as max_vid_length', [pmsID]))
		.select(knex.raw('(select value from simple_default where pms_user_id=? AND setting_name=\'default-like\') as default_like', [pmsID]))
		.select(knex.raw('(select value from simple_default where pms_user_id=? AND setting_name=\'default-category\') as default_category', [pmsID]))
		.select(knex.raw('(select value from simple_default where pms_user_id=? AND setting_name=\'default-language\') as default_language', [pmsID]))
		.select(knex.raw('(select count(*) from playlists where pms_user_id=?) as playlists_count', [pmsID]))
		.select(knex.raw('(select count(*) from comments where pms_user_id=? AND comment_id is NULL) as comments_count', [pmsID]))
		.select(knex.raw('(select count(*) from signatures where pms_user_id=?) as signatures_count', [pmsID]))
		.select(knex.raw('(select count(*) from tags where pms_user_id=?) as tags_count', [pmsID]))
		.select(knex.raw('(select count(*) from thumbnails where pms_user_id=?) as thumbnails_count', [pmsID]))
		.select(knex.raw('(select count(*) from intros_or_outros where pms_user_id=? AND finished_uploading=true AND upload_failed=false AND intro_or_outro=\'intro\') as intros_count', [pmsID]))
		.select(knex.raw('(select count(*) from intros_or_outros where pms_user_id=? AND finished_uploading=true AND upload_failed=false AND intro_or_outro=\'outro\') as outros_count', [pmsID]))
		.then(function(results) {
			if (results.length > 0) {
				return resolve(results[0]);
			} else {
				return resolve(null);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getSpecificIntroOutro = function(userID, pmsID, gameName, linkURL) {
	return new Promise(function(resolve, reject) {
		return knex('intros_or_outros')
		.where("user_id", "=", userID)
		.where("pms_user_id", "=", pmsID)
		.where("game", "=", gameName)
		.where("file_location", "=", linkURL)
		.then(function(results) {
			if (results.length > 0) {
				return resolve(results[0]);
			} else {
				return resolve(undefined);
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.getIntrosOutros = function(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex('intros_or_outros')
		.select(["file_location", "game", "uses", "created_at", "intro_or_outro"])
		.where("pms_user_id", "=", pmsID)
		.whereNull("nonce")
		.where("finished_uploading", "=", true)
		.where("upload_failed", "=", false)
		.orderBy("created_at", "DESC")
		.then(function(results) {
			return resolve(results);
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getThumbnails = function(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex('thumbnails')
		.where("pms_user_id", "=", pmsID)
		.then(function(results) {
			for (var i = 0; i < results.length; i++) {
				delete results[i].id;
				delete results[i].updated_at;
				delete results[i].pms_user_id;
			}

			return resolve(results);
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getPlaylists = function(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex('playlists')
		.where("pms_user_id", "=", pmsID)
		.then(function(results) {
			if (results.length >= 0) {
				return resolve(results);
			} else {
				return resolve([]);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getCommentsForGame = function(pmsID, gameName) {
	return new Promise(function(resolve, reject) {
		return knex('comments')
		.where("pms_user_id", "=", pmsID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
	    .whereNull("comment_id")
		.then(function(results) {
			if (results.length >= 0) {
				return resolve(results);
			} else {
				return resolve([]);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getComments = function(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex('comments')
		.where("pms_user_id", "=", pmsID)
	    .whereNull("comment_id")
		.then(function(results) {
			if (results.length >= 0) {
				return resolve(results);
			} else {
				return resolve([]);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getSignatures = function(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex('signatures')
		.where("pms_user_id", "=", pmsID)
		.then(function(results) {
			if (results.length >= 0) {
				return resolve(results);
			} else {
				return resolve([]);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getTags = function(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex('tags')
		.where("pms_user_id", "=", pmsID)
		.then(function(results) {
			if (results.length >= 0) {
				return resolve(results);
			} else {
				return resolve([]);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.updateSimpleSetting = function(pmsID, settingName, setting) {
	return new Promise(function(resolve, reject) {
		return knex('simple_default')
		.where("pms_user_id", "=", pmsID)
		.where("setting_name", "=", settingName)
		.update({
			value: setting,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.addTag = function(pmsID, gameName, tag) {
	return new Promise(function(resolve, reject) {
		return knex('tags')
		.insert({
			pms_user_id: pmsID,
			game: gameName,
			tag: tag,
			created_at: new Date(),
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.removeTag = function(pmsID, gameName, tag) {
	return new Promise(function(resolve, reject) {
		return knex('tags')
		.where("pms_user_id", "=", pmsID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.where("tag", "=", tag)
		.del()
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.deleteThumbnail = function(pmsID, gameName, image) {
	return new Promise(function(resolve, reject) {
		return knex('thumbnails')
		.where("pms_user_id", "=", pmsID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.where("image_name", "=", image)
		.del()
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.addThumbnail = function(pmsID, gameName, image, hijacked, hijackedName) {
	return new Promise(function(resolve, reject) {
		return knex('thumbnails')
		.insert({
			pms_user_id: pmsID,
			game: gameName,
			image_name: image,
			hijacked: hijacked,
			hijacked_name: hijackedName,
			created_at: new Date(),
			updated_at: new Date()
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.addSignature = function(pmsID, gameName, signature) {
	return new Promise(function(resolve, reject) {
		return knex('signatures')
		.insert({
			pms_user_id: pmsID,
			game: gameName,
			signature: signature,
			created_at: new Date(),
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.removeSignature = function(pmsID, gameName, signature) {
	return new Promise(function(resolve, reject) {
		return knex('signatures')
		.where("pms_user_id", "=", pmsID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.where("signature", "=", signature)
		.del()
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.addComment = function(pmsID, gameName, comment) {
	return new Promise(function(resolve, reject) {
		return knex('comments')
		.insert({
			pms_user_id: pmsID,
			game: gameName,
			comment: comment,
			created_at: new Date(),
			updated_at: new Date(),
			comment_id: null
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.removeComment = function(pmsID, gameName, comment) {
	return new Promise(function(resolve, reject) {
		return knex('comments')
		.where("pms_user_id", "=", pmsID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.where("comment", "=", comment)
	    .whereNull("comment_id")
	    .del()
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.postedComment = function(pmsID, gameName, comment, commentID, commentPostID) {
	return new Promise(function(resolve, reject) {
		return knex('comments')
		.where("pms_user_id", "=", pmsID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.where("comment", "=", comment)
		.where("id", "=", commentID)
	    .whereNull("comment_id")
	    .update({
	    	comment_id: commentPostID
	    })
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.addPlaylist = function(pmsID, gameName, playlistID) {
	return new Promise(function(resolve, reject) {
		return knex('playlists')
		.insert({
			pms_user_id: pmsID,
			game: gameName,
			playlist_id: playlistID,
			created_at: new Date(),
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.deletePlaylist = function(pmsID, gameName, playlistID) {
	return new Promise(function(resolve, reject) {
		return knex('playlists')
		.where("pms_user_id", "=", pmsID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.where("playlist_id", "=", playlistID)
		.del()
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function createNewUserDefaults(pmsID) {
	var minVidLength = {
		pms_user_id: pmsID,
		setting_name: "minimum-length",
		value: "7",
		created_at: new Date(),
		updated_at: new Date()
	};
	var maxVidLength = {
		pms_user_id: pmsID,
		setting_name: "maximum-length",
		value: "11",
		created_at: new Date(),
		updated_at: new Date()
	};
	var defaultLike = {
		pms_user_id: pmsID,
		setting_name: "default-like",
		value: "true",
		created_at: new Date(),
		updated_at: new Date()
	};
	var defaultCategory = {
		pms_user_id: pmsID,
		setting_name: "default-category",
		value: "20",
		created_at: new Date(),
		updated_at: new Date()
	};
	var defaultLanguage = {
		pms_user_id: pmsID,
		setting_name: "default-language",
		value: "en",
		created_at: new Date(),
		updated_at: new Date()
	};

	return new Promise(function(resolve, reject) {
		return knex('simple_default')
		.insert([minVidLength, maxVidLength, defaultLike, defaultCategory, defaultLanguage])
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function createNewUserNotifications(pmsID) {
	var dashboardNotification = {
		pms_user_id: pmsID,
		notification: "dashboard-intro",
		created_at: new Date(),
		updated_at: new Date()
	};
	var videosNotification = {
		pms_user_id: pmsID,
		notification: "videos-intro",
		created_at: new Date(),
		updated_at: new Date()
	};
	var accountNotification = {
		pms_user_id: pmsID,
		notification: "account-intro",
		created_at: new Date(),
		updated_at: new Date()
	};
	var defaultsNotification = {
		pms_user_id: pmsID,
		notification: "defaults-intro",
		created_at: new Date(),
		updated_at: new Date()
	};

	return new Promise(function(resolve, reject) {
		return knex('notifications')
		.insert([dashboardNotification, videosNotification, accountNotification, defaultsNotification])
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function _createNotificationHelper(pmsID, notificationName, contentStr) {
	return new Promise(function(resolve, reject) {
		return knex('notifications')
		.insert({
			pms_user_id: pmsID,
			notification: notificationName,
			seen: false,
			content: contentStr,
			created_at: new Date(),
			updated_at: new Date()
		})
		.then(function(result) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.createUploadingNotification = function(pmsID, contentStr) {
	return _createNotificationHelper(pmsID, "currently-uploading", contentStr);
}

module.exports.createProcessingNotification = function(pmsID, contentStr) {
	return _createNotificationHelper(pmsID, "currently-processing", contentStr);
}

module.exports.createDownloadNotification = function(pmsID, contentStr) {
	return _createNotificationHelper(pmsID, "currently-clipping", contentStr);
}

module.exports.createDoneUploadingNotification = function(pmsID, contentStr) {
	return _createNotificationHelper(pmsID, "done-uploading", contentStr);
}

function createNeedTitleOrDescriptionNotification(pmsID, contentStr) {
	return _createNotificationHelper(pmsID, "need-title-or-description", contentStr);
}

function userInPlaceboDB(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex('placebo_user')
		.where("user_id", "=", pmsID)
		.then(function(results) {
			if (results.length == 0) {
				return resolve(false);
			} else {
				return resolve(true);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function isUserInPlaceboState(pmsID) {
	return new Promise(function(resolve, reject) {
		var key = "user_in_placebo_state_pms_id_" + pmsID;

		return redis.get(key, function(err, reply) {
            if (!err && reply != null) {
                return resolve(true);
            } else {
                return userInPlaceboDB(pmsID)
                .then(function(inDB) {
                	if (inDB) { // Set it for the future if needed.
                		redis.set(key, "true", "EX", 3600);
                	}

                	return resolve(inDB);
                })
                .catch(function(err) {
                	return reject(ErrorHelper.dbError(err));
                });
            }
        });
	});
}

function setUserInPlaceboStateCached(pmsID) {
	return new Promise(function(resolve, reject) {
		var key = "user_in_placebo_state_pms_id_" + pmsID;
		var ttl = 3600; // 1 Hour

		var multi = redis.multi();
		multi.set(key, "true", "EX", ttl);
		multi.exec(function (err, replies) {
		    return resolve();
		});
	});
}

function setUserNotInPlaceboStateCached(pmsID) {
	return new Promise(function(resolve, reject) {
		var key = "user_in_placebo_state_pms_id_" + pmsID;

		var multi = redis.multi();
		multi.del(key);
		multi.exec(function (err, replies) {
		    return resolve();
		});
	});
}

function setUserNotInPlaceboState(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex('placebo_user')
		.where("user_id", "=", pmsID)
		.del()
		.then(function() {
			return setUserNotInPlaceboStateCached(pmsID);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function addUserToPlaceboState(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex('placebo_user')
		.insert({
			user_id: pmsID,
			created_at: new Date(),
			updated_at: new Date()
		})
		.then(function() {
			return setUserInPlaceboStateCached(pmsID);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.registerUser = function(username, ID, email) {
	return new Promise(function(resolve, reject) {
		cLogger.info("Creating new user.");
		return knex('users')
		.insert({
			username: username,
			pms_user_id: ID,
			email: email,
			password: "tmp_password",
			created_at: new Date(),
			updated_at: new Date()
		})
		.then(function() {
			return createNewUserNotifications(ID);
		})
		.then(function() {
			return createNewUserDefaults(ID);
		})
		.then(function() {
			return addUserToPlaceboState(ID);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.updateUser = function(username, ID, email, password) {
	return new Promise(function(resolve, reject) {
		cLogger.info("Updating user, email or password is different.");
		return knex('users')
		.where('username', '=', username)
		.where('pms_user_id', '=', ID)
		.update({
			email: email,
			password: password,
			updated_at: new Date()
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.updateUserPasswordPlaceboState = function(username, ID, email, password) {
	return handleInPlaceboState(true, username, ID, email, password);
}

function handleInPlaceboState(inPlaceboState, username, ID, email, password) {
	return new Promise(function(resolve, reject) {
		if (!inPlaceboState) { // They aren't in the placebo state, so make sure that they are authorized to make this call.
			return knex('users')
			.where("username", "=", username)
			.where("pms_user_id", "=", ID)
			.where("email", "=", email)
			.where("password", "=", password)
			.then(function(results) {
				if (results.length == 0) {
					return reject(Errors.notAuthorized());
				} else {
					return resolve();
				}
			})
			.catch(function(err) {
				return reject(ErrorHelper.dbError(err));
			});
		} else {
			return knex('users')
			.where("username", "=", username)
			.where("pms_user_id", "=", ID)
			.where("email", "=", email)
			.update({
				password: password,
				updated_at: new Date()
			})
			.then(function(results) {
				return setUserNotInPlaceboState(ID);
			})
			.then(function() {
				return resolve();
			})
			.catch(function(err) {
				return reject(ErrorHelper.dbError(err));
			});
		}
	});
}

module.exports.createOrUpdateUserSubscriptions = function(username, ID, email, password, payments, subs) {
	var subscriptions = JSON.parse(subs);

	return new Promise(function(resolve, reject) {
		return isUserInPlaceboState(ID)
		.then(function(inPlaceboState) {
			return handleInPlaceboState(inPlaceboState, username, ID, email, password);
		})
		.then(function() {
			return addNewSubscriptions(ID, subscriptions);
		})
		.then(function() {
			return addNewPayments(ID, payments);
		})
		.then(function() {
			return getCurrentActiveSubscription(ID);
		})
		.then(function(activeSubscriptionInfo) {
			return resolve(activeSubscriptionInfo);
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function updateRedisValidUserKey(username, ID, oldEmail, oldPassword, newEmail, newPassword, internalID) {
	return new Promise(function(resolve, reject) {
		var oldRedisKey = "valid_user_" + username + "_" + ID + "_" + oldEmail + "_" + oldPassword;
		var newRedisKey = "valid_user_" + username + "_" + ID + "_" + newEmail + "_" + newPassword;
		var multi = redis.multi();
		multi.del(oldRedisKey);
		multi.set(newRedisKey, (internalID + ""), "EX", 3600); // 1 Hour
		multi.exec(function (err, replies) {
		    return resolve();
		});
	});
}

function _getNumberOfVideosLeftInMonth(pmsID, activeSubscriptionID) {
	return new Promise(function(resolve, reject) {
		// Lets not error here.
		if (activeSubscriptionID == "-1" || parseInt(activeSubscriptionID) == -1) {
			return resolve(0);
		}


		var key = "users_number_of_videos_left_" + pmsID;

		return redis.get(key, function(err, reply) {
            if (!err && reply != null && reply != "") {
            	return resolve(parseInt(reply));
            } else {
            	var subInfo = Attr.SUBSCRIPTION_VIDEO_CAPS.get(activeSubscriptionID);

				if (subInfo == undefined) {
					return ErrorHelper.dbError(new Error("The subscription was not defined: " + activeSubscriptionID));
				} else {
					if (subInfo.per_month) {
						return knex('youtube_videos')
						.whereRaw("user_id = (SELECT id FROM users WHERE pms_user_id = ? )::text", [pmsID])
						.whereRaw("created_at >= (SELECT updated_at FROM payments WHERE pms_user_id = ?)", [pmsID])
						.count('id as CNT')
						.then(function(total) {
							var numberLeft = (subInfo.videos_allowed - parseInt(total[0].CNT));
                			redis.set(key, numberLeft + "", "EX", 3600);
							return resolve(numberLeft);
						})
						.catch(function(err) {
							return reject(err);
						});
					} else {
						return knex('youtube_videos')
						.whereRaw("user_id = (SELECT id FROM users WHERE pms_user_id = ? )::text", [pmsID])
						.count('id as CNT')
						.then(function(total) {
							var numberLeft = (subInfo.videos_allowed - parseInt(total[0].CNT));
                			redis.set(key, numberLeft + "", "EX", 3600);
							return resolve(numberLeft);
						})
						.catch(function(err) {
							return reject(err);
						});
					}
				}
            }
        });
	});
}

module.exports.getActiveSubscriptionWrapper = function(pmsID) {
	return getCurrentActiveSubscription(pmsID);
}

function userHasHardcodedSubscription(pmsID) {
	var hardcodedSubscriptions = Attr.HARDCODED_SUBSCRIPTIONS;
	var hardcodedSubscriptionID = undefined;

	// Check if its hardcoded
	for (var i = 0; i < hardcodedSubscriptions.length; i++) {
		if (hardcodedSubscriptions[i].pms_id == parseInt(pmsID)) {
			hardcodedSubscriptionID = hardcodedSubscriptions[i].subscription_id;
			break;
		}
	}

	return hardcodedSubscriptionID;
}

function _getActiveSubscriptionIDHelper(pmsID) {
	return new Promise(function(resolve, reject) {
		var hardcodedSubscriptionID = userHasHardcodedSubscription(pmsID);

		if (hardcodedSubscriptionID != undefined) {
			return resolve([hardcodedSubscriptionID, false, ""]);
		} else {
			return knex('payments')
			.select("subscription_id")
			.select(knex.raw('(SELECT banned FROM users WHERE pms_user_id=payments.pms_user_id) as banned'))
			.select(knex.raw('(SELECT banned_reason FROM users WHERE pms_user_id=payments.pms_user_id) as banned_reason'))
			.where("pms_user_id", "=", pmsID)
			.whereRaw("updated_at >= (select date_trunc(\'day\', NOW() - interval \'1 month\'))")
			.orderBy("subscription_id", "DESC")
			.limit(1)
			.then(function(results) {
				if (results.length == 0) {
					// First check if they are a basic user
					return knex('user_subscriptions')
					.select("subscription_id")
					.select(knex.raw('(SELECT banned FROM users WHERE pms_user_id=user_subscriptions.pms_user_id) as banned'))
					.select(knex.raw('(SELECT banned_reason FROM users WHERE pms_user_id=user_subscriptions.pms_user_id) as banned_reason'))
					.where("pms_user_id", "=", pmsID)
					.where("status", "=", "active")
					.orderBy("created_at", "DESC")
					.limit(1)
					.then(function(subscriptionResults) {
						if (!subscriptionResults || subscriptionResults.length == 0 || subscriptionResults[0].subscription_id != "667") {
							return resolve([-1, false, ""]);
						} else {
							return resolve([subscriptionResults[0].subscription_id, subscriptionResults[0].banned, subscriptionResults[0].banned_reason]);
						}
					})
					.catch(function(err) {
						return reject(err);
					});
				} else {
					return resolve([results[0].subscription_id, results[0].banned, results[0].banned_reason]);
				}
			})
			.catch(function(err) {
				return reject(err);
			});
		}
	});
}

function getCurrentActiveSubscription(pmsID) {
	var activeSubscriptionID = -1;
	var userBanned = false;
	var userBannedReason = "";

	return new Promise(function(resolve, reject) {
		return _getActiveSubscriptionIDHelper(pmsID)
		.then(function(subscriptionIDAndBanned) {
			activeSubscriptionID = subscriptionIDAndBanned[0];
			userBanned = subscriptionIDAndBanned[1];
			userBannedReason = subscriptionIDAndBanned[2];

			if (activeSubscriptionID == -1 || activeSubscriptionID == undefined) {
				return resolve([-1, 0, false, ""]);
			} else {
				return _getNumberOfVideosLeftInMonth(pmsID, activeSubscriptionID);
			}
		})
		.then(function(numVideosLeft) {
			return resolve([activeSubscriptionID, numVideosLeft, userBanned, userBannedReason]);
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function addNewPayments(pmsID, paymentsRAW) {
	var payments = JSON.parse(paymentsRAW);

	return new Promise(function(resolve, reject) {
		if (payments.length == 0) {
			return resolve();
		}

		var count = 0;
		function next() {
			return knex('payments')
			.select(['status', 'updated_at'])
			.where('pms_user_id', '=', pmsID)
			.where('subscription_id', '=', payments[count].subscription_plan_id)
			.where('payment_gateway', '=', payments[count].payment_gateway)
			.then(function(result) {
				if (result.length == 0) {
					cLogger.info("Payment doesn't exist, verifying payment integrity with Stripe first.");
					return stripePaymentExists(payments[count].transaction_id)
					.then(function() {
						return insertPayment(pmsID, payments[count])
						.then(function() {
							count++;
							if (count < payments.length - 1) {
								return next();
							} else {
								// Clear the cached count since it needs to be recalculated.
								var key = "users_number_of_videos_left_" + pmsID;
								redis.del(key);

								return resolve();
							}
						})
						.catch(function(err) {
							return reject(ErrorHelper.dbError(err));
						});
					})
					.catch(function(err) {
						// This charge doesn't actually exist. Something fishy is happening...
						// Just continue for now, however don't add the charge to the db.
						count++;
						if (count < payments.length - 1) {
							return next();
						} else {
							return resolve();
						}
					});
				} else { // Already exists, so just update
					var previousPaymentDate = new Date(result[0].updated_at);
					var newPaymentDate = new Date(payments[count].date);

					if (result[0].status != payments[count].status || newPaymentDate > previousPaymentDate) {
						cLogger.info("Payment already exists. Updating and Continuing.");
						return knex('payments')
						.where('pms_user_id', '=', pmsID)
						.where('subscription_id', '=', payments[count].subscription_plan_id)
						.where('payment_gateway', '=', payments[count].payment_gateway)
						.update({
							status: payments[count].status,
							updated_at: newPaymentDate
						})
						.then(function() {
							count++;
							if (count < payments.length - 1) {
								return next();
							} else {
								// Clear the cached count since it needs to be recalculated.
								var key = "users_number_of_videos_left_" + pmsID;
								redis.del(key);

								return resolve();
							}
						})
						.catch(function(err) {
							return reject(ErrorHelper.dbError(err));
						});
					} else {
						count++;
						if (count < payments.length - 1) {
							return next();
						} else {
							return resolve();
						}
					}
				}
 			})
			.catch(function(err) {
				return reject(ErrorHelper.dbError(err));
			});
		}

		return next();
	});
}

function insertPayment(ID, payment) {
	return new Promise(function(resolve, reject) {
		return knex('payments')
		.insert({
			pms_user_id: ID,
			subscription_id: payment.subscription_plan_id,
			amount: payment.amount,
			status: payment.status,
			date: payment.date,
			payment_gateway: payment.payment_gateway,
			transaction_id: payment.transaction_id,
			ip_address: payment.ip_address,
			created_at: new Date(),
			updated_at: new Date()
		})
		.then(function(result) {
			cLogger.info("Added payment to db.");
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function stripePaymentExists(transactionID) {
	return new Promise(function(resolve, reject) {
		// First check in production stripe
		stripeProd.charges.retrieve(
			transactionID,
			function(err, transaction) {
				if (err) {
					stripeTest.charges.retrieve(
						transactionID,
						function(err1, transaction1) {
							if (err1) {
								return reject();
							} else {
								cLogger.info("Found charge in testing environment!");
								if (validCharge(transaction1)) {
									return resolve();
								} else {
									return reject();
								}
							}
						}
					);
				} else {
					cLogger.info("Found charge in production environment!");
					if (validCharge(transaction)) {
						return resolve();
					} else {
						return reject();
					}
				}
			}
		);
	});
}

function validCharge(charge) {
	if (charge.amount == 0) {
		cLogger.info("This charge was for nothing, seems suspicous. Not adding as legit charge.");
		return false;
	}
	if (charge.description == "Casual" && charge.amount != 699) {
		cLogger.info("This charge has a price mismatch, the Casual amount needs to be 699 however we found: " + transaction1.amount);
		return false;
	}
	if (charge.description == "Professional" && charge.amount != 1999) {
		cLogger.info("This charge has a price mismatch, the Professional amount needs to be 1999 however we found: " + transaction1.amount);
		return false;
	}
	if (charge.failure_code != null || charge.failure_message != null) {
		cLogger.info("This charge has a failure code (" + charge.failure_code + ") or message: " + charge.failure_message);
		return false;
	}
	if (charge.refunded) {
		cLogger.info("This charge was refunded.");
		return false;
	}
	if (charge.status != "succeeded") {
		cLogger.info("The status of this charge is not succeeded, it is: " + charge.status);
		return false;
	}

	// Passes all of the conditions
	return true;
}

function addNewSubscriptions(pmsID, subs) {
	return new Promise(function(resolve, reject) {
		if (subs.length == 0) {
			return resolve();
		}

		var count = 0;
		function next() {
			return knex('user_subscriptions')
			.select("status")
			.where('pms_user_id', '=', pmsID)
			.where('subscription_id', '=', subs[count].subscription_plan_id)
			.limit(1)
			.then(function(result) {
				if (result.length == 0) { // Doesn't exist yet
					cLogger.info("Creating a new subscription (" + subs[count].subscription_plan_id + ") for " + pmsID);
					return knex('user_subscriptions')
					.insert({
						pms_user_id: pmsID,
						subscription_id: subs[count].subscription_plan_id,
						status: subs[count].status,
						start_date: subs[count].start_date,
						payment_profile_id: subs[count].payment_profile_id,
						created_at: new Date(),
						updated_at: new Date()
					})
					.then(function() {
						count++;
						if (count < subs.length - 1) {
							return next();
						} else {
							return resolve();
						}
					})
					.catch(function(err) {
						return reject(ErrorHelper.dbError(err));
					});
				} else {
					if (result[0].status != subs[count].status) {
						cLogger.info("Updating a subscription (" + subs[count].subscription_plan_id + ") for " + pmsID);
						return knex('user_subscriptions')
						.where('pms_user_id', '=', pmsID)
						.where('subscription_id', '=', subs[count].subscription_plan_id)
						.update({
							status: subs[count].status,
							start_date: subs[count].start_date,
							payment_profile_id: subs[count].payment_profile_id,
							updated_at: new Date()
						})
						.then(function() {
							count++;
							if (count < subs.length - 1) {
								return next();
							} else {
								return resolve();
							}
						})
						.catch(function(err) {
							return reject(ErrorHelper.dbError(err));
						});
					} else {
						count++;
						if (count < subs.length - 1) {
							return next();
						} else {
							return resolve();
						}
					}
				}
			})
			.catch(function(err) {
				return reject(ErrorHelper.dbError(err));
			});
		}

		return next();
	});
}

module.exports.needToStopDownload = function(userID, gameName, twitchLink, ID) {
	var stop = true;
	var dontStop = false;

	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "=", ID)
		.where("user_id", "=", userID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.where("twitch_link", "=", twitchLink)
		.orderBy("updated_at", "desc")
		.limit(1)
		.then(function(results) {
			if (results.length == 0) {
				cLogger.info("Can't seem to find a download db attribute??");
				ErrorHelper.scopeConfigure("db.needToStopDownload", {
					id: ID,
					user_id: userID,
					game: gameName,
					twitch_link: twitchLink
				});
				ErrorHelper.emitSimpleError(new Error("Attempting to stop a download, however couldn't find the download object."));

				return resolve(stop);
			}

			if (results[0].state != "init-stop" && results[0].state != "done") {
				return resolve(dontStop);
			} else {
				return resolve(stop);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getVideosToBeCombined = function(userID, downloadID, gameName) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "!=", downloadID)
		.where("user_id", "=", userID)
		.where("used", "=", false)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.whereIn("state", ["done", "done-need-info"])
		.where("exclusive", "=", false)
		.where("deleted", "=", false)
		.whereNotExists(knex.select('*').from('custom_options').whereRaw('downloads.id = custom_options.option_value::integer AND custom_options.option_name = \'custom_clip_deletion\' AND custom_options.user_id = \'' + userID + '\' AND custom_options.download_id = \'' + downloadID + '\''))
		.orderBy("updated_at", "DESC")
		.then(function(results) {
			if (results.length == 0) {
				return resolve([]);
			} else {
				return resolve(results);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.setDownloadExclusive = function(userID, downloadID, exclusive) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "=", downloadID)
		.where("user_id", "=", userID)
		.update({
			exclusive: exclusive // DO NOT UPDATE 'updated_at' as this is used to calculate download length.
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function titleOrDescExists(type, userID, downloadID) {
	return new Promise(function(resolve, reject) {
		switch (type) {
			case "titles":
			case "descriptions":
				return knex(type)
				.where("user_id", "=", userID)
				.where("download_id", "=", downloadID)
				.then(function(results) {
					if (results.length == 0) {
						return resolve(false);
					} else {
						return resolve(true);
					}
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			default: 
				return reject(new Error("db.titleOrDescExists: Passed in something except for titles or descriptions."));
		}
	});
}

function possiblyUpdateDownloadState(userID, pmsID, downloadID) {
	var titleExists = false;
	var descExists = false;
	return new Promise(function(resolve, reject) {
		return titleOrDescExists("titles", userID, downloadID)
		.then(function(tExists) {
			titleExists = tExists;
			return titleOrDescExists("descriptions", userID, downloadID);
		})
		.then(function(dExists) {
			descExists = dExists;

			if (titleExists == false || descExists == false) {
				return resolve();
			} else {
				return knex('downloads')
				.where("user_id", "=", userID)
				.where("id", "=", downloadID)
				.whereNotIn('state', ["started", "preparing"])
				.update({
					state: "done", // DO NOT UPDATE updated_at here since this is used to show video length.
				})
				.then(function(results) {
					return _setNotificationsSeen(pmsID, ["currently-clipping", "need-title-or-description", "currently-processing", "currently-uploading", "done-uploading"]);
				})
				.then(function() {
					// TODO: Send this to do encoding next

					return resolve();
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function setTitleDescHelper(type, userID, pmsID, downloadID, value) {
	return new Promise(function(resolve, reject) {
		if (type == "titles" && value == "") {
			cLogger.info("The title is empty, so nothing to set.");
			return resolve();
		}

		return titleOrDescExists(type, userID, downloadID)
		.then(function(results) {
			if (results) { // Already exists
				return knex(type)
				.where("user_id", "=", userID)
				.where("download_id", "=", downloadID)
				.update({
					value: value,
					updated_at: new Date()
				})
				.then(function(results) {
					return possiblyUpdateDownloadState(userID, pmsID, downloadID);
				})
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			} else {
				return knex(type)
				.insert({
					user_id: userID,
					download_id: downloadID,
					value: value,
					updated_at: new Date(),
					created_at: new Date()
				})
				.then(function(results) {
					return possiblyUpdateDownloadState(userID, pmsID, downloadID);
				})
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.setTitle = function(userID, pmsID, downloadID, title) {
	return setTitleDescHelper("titles", userID, pmsID, downloadID, title);
}

module.exports.setDescription = function(userID, pmsID, downloadID, descr) {
	return setTitleDescHelper("descriptions", userID, pmsID, downloadID, descr);
}

function reEnableNeedClipInfoNotification(pmsID, content) {
	return new Promise(function(resolve, reject) {
		return knex('notifications')
		.where("notification", "=", "need-title-or-description")
		.where("pms_user_id", "=", pmsID)
		.where("content", "=", content)
		.update({
			seen: false,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure("db.reEnableNeedClipInfoNotification", {pms_user_id: pmsID});
			ErrorHelper.emitSimpleError(err);

			return resolve();
		});
	});
}

module.exports.setClipAsUnDeleted = function(userID, pmsID, downloadID) {
	return new Promise(function(resolve, reject) {
		return _getDownload(userID, downloadID)
		.then(function(result) {
			if (result.state == "deleted") {
				return reject(new Error("This has been permanetly deleted. This only happens 48 hours after marking it as deleted."));
			} else {
				return knex('downloads')
				.where('id', '=', downloadID)
				.where('user_id', '=', userID)
				.update({
					state: "done-need-info",
					deleted: false,
					deleted_at: null // DONT SET UPDATED AT HERE SINCE THATS USED TO DISPLAY VIDEO TIME
				})
				.then(function(results) {
					return reEnableNeedClipInfoNotification(pmsID, JSON.stringify({download_id: parseInt(downloadID)}));
				})
				.then(function() {
					return possiblyUpdateDownloadState(userID, pmsID, downloadID);
				})
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.setClipAsDeleted = function(userID, pmsID, downloadID) {
	return new Promise(function(resolve, reject) {
		return _getDownload(userID, downloadID)
		.then(function(result) {
			if (result.state == "deleted") {
				return reject(new Error("The clip has already been permanetly deleted."));
			} else {
				return knex('downloads')
				.where("id", "=", downloadID)
				.where("user_id", "=", userID)
				.update({
					state: "deleted-soon",
					deleted: true,
					deleted_at: new Date() // DONT SET UPDATED AT HERE SINCE THATS USED TO DISPLAY VIDEO TIME
				})
				.then(function(results) {
					return _setNotificationsSeen(pmsID, ["currently-clipping", "need-title-or-description", "currently-processing", "currently-uploading", "done-uploading"]);
				})
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.updateDownloadedFileLocation = function(userID, downloadID, cdnFile) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("user_id", "=", userID)
		.where("id", "=", downloadID)
		.update({
			downloaded_file: cdnFile // DO NOT UPDATE 'updated_at' as this is used to calculate download length.
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function _getDownload(userID, downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.select("*")
		.select(knex.raw('(SELECT value FROM titles WHERE user_id=\'' + userID + '\' AND download_id=\'' + downloadID + '\') as title'))
		.select(knex.raw('(SELECT value FROM descriptions WHERE user_id=\'' + userID + '\' AND download_id=\'' + downloadID + '\') as description'))
		.where("id", "=", downloadID)
		.where("user_id", "=", userID)
		.then(function(results) {
			if (results.length == 0) {
				return resolve(undefined);
			}
			return resolve(results[0]);
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getDownloadWithVideoURL = function(downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.select("*")
		.select(knex.raw('(SELECT url FROM youtube_videos WHERE video_number=downloads.video_number AND user_id=downloads.user_id) as youtube_link'))
		.where("id", "=", parseInt(downloadID))
		.then(function(results) {
			if (results.length == 0) {
				return resolve(undefined);
			} else {
				return resolve(results[0]);
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.getDownload = function(userID, downloadID) {
	return _getDownload(userID, downloadID);
}

module.exports.addDownload = function(downloadObj) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.insert(downloadObj)
		.returning('id')
		.then(function(id) {
			return resolve(id[0]);
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.setUsed = function(clipObject) {
	return new Promise(function(resolve, reject) {
		knex('used_content')
		.insert(clipObject)
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.episodeCount = function(gameName) {
	return new Promise(function(resolve, reject) {
		knex('youtube_videos')
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.count('id as CNT')
		.then(function(total) {
			return resolve(total[0].CNT);
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getLatestClips = function(gameName) {
	return new Promise(function(resolve, reject) {
		knex('used_content')
		.select(knex.raw('date_trunc(\'day\', used_content.created_at) "day"'))
		.select(knex.raw('count(*) number'))
		.groupBy("day")
		.orderBy("day", "desc")
		.limit(1)
		.then(function(results) {
			if (results.length == 0) {
				return reject(new Error("Could not find any most recent day. This is HIGHLY unlikely."));
			}

			let dateVal = results[0].day.toISOString();

			return new Promise(function(res, rej) {
				knex('used_content')
				.select("clip_channel_name", "game", "clip_url")
				.where(knex.raw('date_trunc(\'day\', created_at)=\'' + dateVal + '\''))
				.where(knex.raw('LOWER(game) = :gameNAME', {
			    	gameNAME: gameName.toLowerCase()
			    }))
				.then(function(results2) {
					return resolve(results2);
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			});
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getPlaylist = function(gameName, userID) {
	return new Promise(function(resolve, reject) {
		knex('playlists')
		.where("user_id", "=", userID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.limit(1)
		.then(function(result) {
			if (result.length > 0) {
				return resolve(result[0].playlist_id);
			}

			return resolve(null);
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getThumbnail = function(userID, gameName, hijacked, hijackedName) {
	return new Promise(function(resolve, reject) {
		if (hijacked) {
			return knex('thumbnails')
			.where("user_id", "=", userID)
			.where(knex.raw('LOWER(game) = :gameNAME', {
		    	gameNAME: gameName.toLowerCase()
		    }))
			.where("hijacked", "=", true)
			.where("hijacked_name", "=", hijackedName)
			.orderBy("created_at", "desc")
			.limit(1)
			.then(function(result) {
				if (result.length == 0) {
					return findGameHijackedThumbnail(gameName, userID)
					.then(function(result1) {
						if (result1 != null) {
							return resolve(result1);
						}
						return findGameThumbnail(gameName, userID);
					})
					.then(function(result2) {
						return resolve(result2);
					})
					.catch(function(err) {
						return reject(ErrorHelper.dbError(err));
					});
				} else {
					return resolve(result[0].image_name)
				}
			})
			.catch(function(err) {
				return reject(ErrorHelper.dbError(err));
			});
		} else {
			return findGameThumbnail(gameName, userID)
			.then(function(result) {
				return resolve(result);
			})
			.catch(function(err) {
				return reject(ErrorHelper.dbError(err));
			});
		}
	});
}

function findGameHijackedThumbnail(gameName, userID) {
	return new Promise(function(resolve, reject) {
		return knex('thumbnails')
		.where("user_id", "=", userID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.where("hijacked", "=", true)
		.whereNull("hijacked_name")
		.orderBy("created_at", "desc")
		.limit(1)
		.then(function(result) {
			if (result.length == 0) {
				return resolve(null);
			} else {
				return resolve(result[0].image_name);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function findGameThumbnail(gameName, userID) {
	return new Promise(function(resolve, reject) {
		return knex('thumbnails')
		.where("user_id", "=", userID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.orderBy("created_at", "desc")
		.limit(1)
		.then(function(result) {
			if (result.length == 0) {
				return resolve(null);
			} else {
				return resolve(result[0].image_name);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.addYoutubeVideo = function(youtubeObj, pmsID) {
	return new Promise(function(resolve, reject) {
		knex('youtube_videos')
		.insert(youtubeObj)
		.then(function(results) {

			// Clear the cached count since it needs to be recalculated.
			var key = "users_number_of_videos_left_" + pmsID;
			redis.del(key);

			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.addRefreshToken = function(clientID, refreshTkn, accessTkn, userID) {
	return new Promise(function(resolve, reject) {
		knex('user_tokens')
		.insert({
			user_id: userID,
			client_id: clientID,
			refresh_token: refreshTkn,
			access_token: accessTkn,
			created_at: new Date(),
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.deleteRefreshToken = function(clientID) {
	return new Promise(function(resolve, reject) {
		knex('user_tokens')
		.where("client_id", "=", clientID)
		.del()
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getRefreshToken = function(clientID) {
	return new Promise(function(resolve, reject) {
		knex('user_tokens')
		.where("client_id", '=', clientID)
		.limit(1)
		.then(function(results) {
			if (results.length > 0) {
				return resolve(results[0]);
			}
			return resolve(null);
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getUsersTokens = function(userID, clientID) {
	return new Promise(function(resolve, reject) {
		return knex('user_tokens')
		.where("user_id", "=", userID)
		.where("client_id", '=', clientID)
		.orderBy("created_at", "DESC")
		.limit(1)
		.then(function(results) {
			if (results.length > 0) {
				return resolve(results[0]);
			}
			return resolve(null);
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.updateStateBasedOnTitleDesc = function(userID, downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('users')
		.where("id", "=", userID)
		.then(function(results) {
			if (results.length == 0) {
				return reject(new Error("Could not find a user associated with the following ID: " + userID));
			} else {
				return checkTitleDescHelper(userID, results[0].pms_user_id, downloadID);
			}
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function checkTitleDescHelper(userID, pmsID, downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('titles')
		.where("user_id", "=", userID)
		.where("download_id", "=", downloadID)
		.then(function(titleResults) {
			var condition1 = (titleResults.length == 0);
			var condition2 = (titleResults.length > 0 && (titleResults[0].value == null || titleResults[0].value == ""));

			if (condition1 || condition2) {
				// Couldn't find a valid title
				return setDownloadToDoneNeedInfo(userID, pmsID, downloadID)
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			} else {
				// Found a valid title, look for a description now
				return knex('descriptions')
				.where("user_id", "=", userID)
				.where("download_id", "=", downloadID)
				.then(function(descResults) {
					var condition11 = (descResults.length == 0);
					var condition12 = (descResults.length > 0 && (descResults[0].value == null || descResults[0].value == ""));

					if (condition11 || condition12) {
						// Couldn't find a valid description
						return setDownloadToDoneNeedInfo(userID, pmsID, downloadID)
						.then(function() {
							return resolve();
						})
						.catch(function(err) {
							return reject(ErrorHelper.dbError(err));
						});
					} else {
						// Found both a valid title, and a valid description
						return resolve();
					}
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function setDownloadToDoneNeedInfo(userID, pmsID, downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "=", downloadID)
		.where("user_id", "=", userID)
		.update({
			state: "done-need-info" // DO NOT UPDATE "updated_at" here since we use it to calculate download video length.
		})
		.then(function(results) {
			return seenNotificationHelper(pmsID, "need-title-or-description");
		})
		.then(function() {
			return createNeedTitleOrDescriptionNotification(pmsID, JSON.stringify({download_id: downloadID}));
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getAllDeleted = function() {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where('state', '=', 'deleted-soon')
		.where('deleted', '=', true)
		.orderBy("deleted_at", "ASC")
		.limit(100)
		.then(function(results) {
			if (results.length == 0) {
				return resolve([]);
			} else {
				return resolve(results);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getAllNeedToBeDeleted = function() {
	return new Promise(function(resolve, reject) {
		return knex('need_to_be_deleted')
		.select("*")
		.select(knex.raw("(SELECT downloaded_file FROM downloads WHERE id=NULLIF(need_to_be_deleted.download_id, '')::int) as downloaded_file"))
		.where("deleted", false)
		.orderBy("created_at", "ASC")
		.limit(100)
		.then(function(results) {
			if (results.length == 0) {
				return resolve([]);
			} else {
				return resolve(results);
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.setAsPermanentlyDeleted = function(downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where('id', '=', downloadID)
		.update({
			deleted: true,
			state: 'deleted',
			downloaded_file: null
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getYoutubeVideoSettings = function(userID, pmsID, downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.select(knex.raw('(SELECT playlist_id FROM playlists WHERE pms_user_id=\'' + pmsID + '\' AND game=downloads.game ORDER BY created_at DESC LIMIT 1) as playlist'))
		.select(knex.raw('(SELECT value FROM simple_default WHERE pms_user_id=\'' + pmsID + '\' AND setting_name=\'default-category\') as category'))
		.select(knex.raw('(SELECT option_value FROM custom_options WHERE user_id=\'' + userID + '\' AND option_name=\'custom_category\' AND download_id=\'' + downloadID + '\' ORDER BY created_at DESC LIMIT 1) as custom_category'))
		.select(knex.raw('(SELECT value FROM simple_default WHERE pms_user_id=\'' + pmsID + '\' AND setting_name=\'default-language\') as vid_language'))
		.select(knex.raw('(SELECT option_value FROM custom_options WHERE user_id=\'' + userID + '\' AND option_name=\'custom_language\' AND download_id=\'' + downloadID + '\' ORDER BY created_at DESC LIMIT 1) as custom_language'))
		.select(knex.raw('(SELECT signature FROM signatures WHERE pms_user_id=\'' + pmsID + '\' AND game=downloads.game ORDER BY created_at DESC LIMIT 1) as signature'))
		.select(knex.raw('(SELECT option_value FROM custom_options WHERE user_id=\'' + userID + '\' AND option_name=\'custom_playlist\' AND download_id=\'' + downloadID + '\' ORDER BY created_at DESC LIMIT 1) as custom_playlist'))
		.select(knex.raw('(SELECT option_value FROM custom_options WHERE user_id=\'' + userID + '\' AND option_name=\'custom_privacy\' AND download_id=\'' + downloadID + '\' ORDER BY created_at DESC LIMIT 1) as custom_privacy'))
		.select(knex.raw('(SELECT value FROM simple_default WHERE pms_user_id=\'' + pmsID + '\' AND setting_name=\'default-like\') as liked'))
		.select(knex.raw('(SELECT value FROM simple_default WHERE pms_user_id=\'' + pmsID + '\' AND setting_name=\'minimum-length\') as minimum_video_length'))
		.select(knex.raw('(SELECT count(*) FROM comments WHERE pms_user_id=\'' + pmsID + '\' AND game=downloads.game AND comment_id is NULL) as comments_count'))
		.select(knex.raw('(SELECT option_value FROM custom_options WHERE user_id=\'' + userID + '\' AND option_name=\'force_processing\' AND download_id=\'' + downloadID + '\' ORDER BY created_at DESC LIMIT 1) as force_video_processing'))
		.where("id", "=", downloadID)
		.then(function(results) {
			if (results.length == 0) {
				return resolve({playlist: null, category: null, vid_language: null, signature: null, liked: "true", comments_count: "0"});
			} else {
				return resolve(results[0]);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getAllTags = function(pmsID, userID, downloadID, gameName) {
	return new Promise(function(resolve, reject) {
		return knex('tags')
		.where("pms_user_id", "=", pmsID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.whereNotExists(knex.select('*').from('custom_options').whereRaw('tags.tag = custom_options.option_value AND custom_options.option_name = \'custom_tag_deletion\' AND custom_options.download_id = \'' + downloadID + '\' AND custom_options.user_id = \'' + userID + '\''))
		.then(function(tags) {
			if (tags.length == 0) {
				return resolve([]);
			} else {
				return resolve(tags);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getCustomClipThumbnail = function(userID, downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('custom_options')
		.where("user_id", "=", userID)
		.where("download_id", "=", downloadID)
		.where("option_name", "=", "custom_thumbnail")
		.orderBy("created_at", "DESC")
		.limit(1)
		.then(function(results) {
			if (results.length == 0) {
				return resolve(null);
			} else {
				return resolve(results[0].option_value);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function _getVideoIntroOrOutroHelper(userID, pmsID, gameName, introOrOutro) {
	return new Promise(function(resolve, reject) {
		return knex('intros_or_outros')
		.select(["id", "file_location"])
		.where("user_id", "=", userID)
		.where("pms_user_id", "=", pmsID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
	    .where("intro_or_outro", "=", introOrOutro)
		.orderBy("created_at", "DESC")
		.limit(1)
		.then(function(results) {
			if (results.length <= 0) {
				return resolve(null);
			} else {
				return resolve(results[0]);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		})
	});
}

module.exports.getVideoIntro = function(userID, pmsID, gameName) {
	return _getVideoIntroOrOutroHelper(userID, pmsID, gameName, "intro");
}

module.exports.getVideoOutro = function(userID, pmsID, gameName) {
	return _getVideoIntroOrOutroHelper(userID, pmsID, gameName, "outro");
}

module.exports.getGameThumbnail = function(pmsID, gameName) {
	return new Promise(function(resolve, reject) {
		return knex('thumbnails')
		.where("pms_user_id", "=", pmsID)
		.where(knex.raw('LOWER(game) = :gameNAME', {
	    	gameNAME: gameName.toLowerCase()
	    }))
		.where("hijacked", "=", false)
		.orderBy("created_at", "DESC")
		.limit(1)
		.then(function(results) {
			if (results.length == 0) {
				return resolve(null);
			} else {
				return resolve(results[0]);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		})
	});
}

module.exports.insertCustomOption = function(userID, downloadID, optionName, optionValue) {
	return new Promise(function(resolve, reject) {
		return knex('custom_options')
		.insert({
			user_id: userID,
			download_id: downloadID,
			option_name: optionName,
			option_value: optionValue,
			created_at: new Date(),
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.addCustomOption = function(userID, downloadID, optionName, optionValue) {
	return new Promise(function(resolve, reject) {
		return knex('custom_options')
		.where("user_id", "=", userID)
		.where("download_id", "=", downloadID)
		.where("option_name", "=", optionName)
		.then(function(results) {
			if (results.length == 0) {
				return knex('custom_options')
				.insert({
					user_id: userID,
					download_id: downloadID,
					option_name: optionName,
					option_value: optionValue,
					created_at: new Date(),
					updated_at: new Date()
				})
				.then(function(results) {
					return resolve();
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			} else {
				return knex('custom_options')
				.where("user_id", "=", userID)
				.where("download_id", "=", downloadID)
				.where("option_name", "=", optionName)
				.update({
					option_value: optionValue,
					updated_at: new Date()
				})
				.then(function(results) {
					return resolve();
				})
				.catch(function(err) {
					return reject(ErrorHelper.dbError(err));
				});
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.deleteCustomOption = function(userID, downloadID, optionName, optionValue) {
	return new Promise(function(resolve, reject) {
		return knex('custom_options')
		.where("user_id", "=", userID)
		.where("download_id", "=", downloadID)
		.where("option_name", "=", optionName)
		.where("option_value", "=", optionValue)
		.del()
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.customTagExists = function(userID, downloadID, optionValue) {
	return new Promise(function(resolve, reject) {
		return knex('custom_options')
		.where("user_id", "=", userID)
		.where("download_id", "=", downloadID)
		.where("option_name", "=", "custom_tag")
		.where("option_value", "=", optionValue)
		.then(function(results) {
			if (results.length > 0) {
				return resolve(true);
			} else {
				return resolve(false);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getCustomTags = function(userID, downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('custom_options')
		.where("user_id", "=", userID)
		.where("download_id", "=", downloadID)
		.where("option_name", "=", "custom_tag")
		.then(function(results) {
			if (results.length == 0) {
				return resolve([]);
			} else {
				return resolve(results);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getAllCustomThumbnails = function(downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('custom_options')
		.where("download_id", "=", downloadID)
		.where("option_name", "=", "custom_thumbnail")
		.then(function(results) {
			if (results.length == 0) {
				return resolve([]);
			} else {
				return resolve(results);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.setDownloadActive = function(downloadID, fileLocation, actualCreatedAt) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "=", downloadID)
		.update({
			state: "started",
			downloaded_file: fileLocation,
			created_at: actualCreatedAt
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.workerStartingUp = function(workerName) {
	return new Promise(function(resolve, reject) {
		return knex.transaction(function(t) {
			return knex('worker_capacity')
			.transacting(t)
			.where("name", "=", workerName)
			.then(function(results) {
				if (results.length == 0) { // First time
					return knex('worker_capacity')
					.transacting(t)
					.insert({
						name: workerName,
						currently_running: 1,
						created_at: new Date(),
						updated_at: new Date()
					})
					.then(t.commit)
					.catch(t.rollback);
				} else {
					return knex('worker_capacity')
					.transacting(t)
					.where("name", "=", workerName)
					.increment('currently_running', 1)
					.update({
						updated_at: new Date()
					})
					.then(t.commit)
					.catch(t.rollback);
				}
			})
			.catch(t.rollback);
		}).then(function() {
			return resolve();
		}).catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.workerShuttingDown = function(workerName) {
	return new Promise(function(resolve, reject) {
		return knex.transaction(function(t) {
			return knex('worker_capacity')
			.transacting(t)
			.where("name", "=", workerName)
			.decrement("currently_running", 1)
			.update({
				updated_at: new Date()
			})
			.then(t.commit)
			.catch(t.rollback);
		}).then(function() {
			return resolve();
		}).catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.workerNoLongerUtilized = function(workerName) {
	return new Promise(function(resolve, reject) {
		return knex.transaction(function(t) {
			return knex('worker_capacity')
			.transacting(t)
			.where("name", "=", workerName)
			.decrement("currently_working", 1)
			.update({
				updated_at: new Date()
			})
			.then(t.commit)
			.catch(t.rollback);
		}).then(function() {
			return resolve();
		}).catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.workerBeingUtilized = function(workerName) {
	return new Promise(function(resolve, reject) {
		return knex.transaction(function(t) {
			return knex('worker_capacity')
			.transacting(t)
			.where("name", "=", workerName)
			.increment("currently_working", 1)
			.update({
				updated_at: new Date()
			})
			.then(t.commit)
			.catch(t.rollback);
		}).then(function() {
			return resolve();
		}).catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.getWorkerInformation = function(workerName) {
	return new Promise(function(resolve, reject) {
		return knex('worker_capacity')
		.where("name", "=", workerName)
		.then(function(results) {
			if (results.length == 0) { // This should theoretically never happen
				ErrorHelper.emitSimpleError(new Error("Can't find a worker associated with name=" + workerName));
				return resolve([0, 0]);
			} else {
				return resolve([results[0].currently_running, results[0].currently_working]);
			}
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.setDownloadInitialOrder = function(userID, downloadID, gameName) {
	return new Promise(function(resolve, reject) {
		return knex.transaction(function(t) {
			return knex('downloads')
			.transacting(t)
			.where("id", "!=", downloadID)
			.where("user_id", "=", userID)
			.where("used", "=", false)
			.where(knex.raw('LOWER(game) = :gameNAME', {
		    	gameNAME: gameName.toLowerCase()
		    }))
			.whereIn("state", ["done", "done-need-info"])
			.where("exclusive", "=", false)
			.where("deleted", "=", false)
			.orderBy("order_number", "DESC")
			.limit(1)
			.then(function(result) {
				var defaultOrderNum = 1;
				if (result.length != 0) {

					// This should never really happen, but for safety update this.
					if (parseInt(result[0].order_number) <= 0) {
						return knex('downloads')
						.transacting(t)
						.where("id", "=", result[0].id)
						.update({
							order_number: 1
						})
						.then(function(result2) {
							defaultOrderNum = 2;
							return knex('downloads')
							.transacting(t)
							.where("id", "=", downloadID)
							.update({
								order_number: defaultOrderNum
							})
							.then(t.commit)
							.catch(t.rollback);
						})
						.catch(t.rollback);
					} else {
						defaultOrderNum = parseInt(result[0].order_number) + 1;
						return knex('downloads')
						.transacting(t)
						.where("id", "=", downloadID)
						.update({
							order_number: defaultOrderNum
						})
						.then(t.commit)
						.catch(t.rollback);
					}
				} else {
					return knex('downloads')
					.transacting(t)
					.where("id", "=", downloadID)
					.update({
						order_number: defaultOrderNum
					})
					.then(t.commit)
					.catch(t.rollback);
				}
			})
			.catch(t.rollback);
		}).then(function() {
			return resolve();
		}).catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

function _swapClipOrderHelper(userID, ID, newOrderNumber, trans) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.transacting(trans)
		.where("user_id", "=", userID)
		.where("id", "=", ID)
		.update({
			order_number: newOrderNumber
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.swapClipOrderNumber = function(userID, downloadID1, downloadID2) {
	return new Promise(function(resolve, reject) {
		return knex.transaction(function(t) {
			return knex('downloads')
			.transacting(t)
			.where("user_id", "=", userID)
			.whereIn("id", [parseInt(downloadID1), parseInt(downloadID2)])
			.whereIn("state", ["done", "done-need-info", "started", "preparing"])
			.where("exclusive", "=", false)
			.where("deleted", "=", false)
			.then(function(results) {
				if (results.length != 2) {
					return reject(Errors.clipsCannotBeSwapped());
				} else {
					// We know the length is == 2 here
					var swap1ID = results[0].id;
					var swap1NewOrderNumber = results[1].order_number;
					var swap2ID = results[1].id;
					var swap2NewOrderNumber = results[0].order_number;

					return _swapClipOrderHelper(userID, swap1ID, swap1NewOrderNumber, t)
					.then(function() {
						return _swapClipOrderHelper(userID, swap2ID, swap2NewOrderNumber, t);
					})
					.then(t.commit)
					.catch(t.rollback);
				}
			})
			.catch(t.rollback);
		}).then(function() {
			return resolve();
		}).catch(function(err) {
			return reject(ErrorHelper.dbError(err));
		});
	});
}

module.exports.updateDownloadDuration = function(downloadID, clipSeconds, newUpdatedAt) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "=", downloadID)
		.update({
			clip_seconds: clipSeconds,
			updated_at: newUpdatedAt // We are purposely updating this here. This is to make the frontend video length accuracy better.
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.setDownloadProcessingEstimate = function(downloadID, processingEstimate) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "=", downloadID)
		.update({
			expected_processing_time: processingEstimate
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.getAllProcessingReadyVideos = function() {
	return new Promise(function(resolve, reject) {
		return knex.raw(
			"SELECT " +
				"id, user_id, expected_processing_time, (SELECT pms_user_id FROM users u2 WHERE u2.id = NULLIF(d1.user_id, '')::int) " +
			"FROM " +
				"downloads d1 " +
			"WHERE " +
				"clip_stopped_downloading = ( " +
					"SELECT clip_stopped_downloading FROM downloads d2 WHERE d1.user_id = d2.user_id AND state='done' ORDER BY (clip_stopped_downloading)::float DESC LIMIT 1 " +
				") AND " +
				"state='done' AND " +
				"downloaded_file IS NOT NULL AND " +
				"deleted=false AND " +
				"position('" + Attr.CDN_URL + "' in downloaded_file) > 0 AND " +
				"NOT EXISTS (SELECT * FROM users u1 WHERE u1.id = NULLIF(d1.user_id, '')::int AND u1.currently_processing = true)"
		)
		.then(function(results) {
			return resolve(results.rows);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.getAllIntroOutrosToDelete = function() {
	return new Promise(function(resolve, reject) {
		return knex.raw(
			"SELECT " +
				"* " +
			"FROM " +
				"intros_or_outros " +
			"WHERE " +
				"finished_uploading=false AND " +
				"nonce IS NOT null AND " +
				"upload_failed=false AND " +
				"updated_at <= NOW() - interval '10 minutes'"
		)
		.then(function(results) {
			return resolve(results.rows);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _setUserVidProcessingValue(userID, pmsID, processingVal) {
	return new Promise(function(resolve, reject) {
		return knex('users')
		.where("id", "=", parseInt(userID))
		.where("pms_user_id", "=", pmsID)
		.update({
			currently_processing: processingVal,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.setUserVidProcessing = function(userID, pmsID) {
	return _setUserVidProcessingValue(userID, pmsID, true);
}


module.exports.setUserVidNotProcessing = function(userID, pmsID) {
	return _setUserVidProcessingValue(userID, pmsID, false);
}

function _updateDownloadStateAndUsed(downloadID, newState) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "=", parseInt(downloadID))
		.update({
			state: newState,
			used: true
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _updateDownloadStateAndUsedAndVidNum(downloadID, newState, vidNumber) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "=", parseInt(downloadID))
		.update({
			state: newState,
			used: true,
			video_number: vidNumber
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.setDownloadProcessing = function(downloadID, vidNumber) {
	return _updateDownloadStateAndUsedAndVidNum(downloadID, "processing", vidNumber);
}

module.exports.setDownloadUploading = function(downloadID) {
	return _updateDownloadStateAndUsed(downloadID, "uploading");
}

module.exports.getAllDownloadsIn = function(downloadIDs) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.whereIn("id", downloadIDs)
		.then(function(results) {
			return resolve(results);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _updateDownloadStateOnly(userID, downloadIDs, newState) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.whereIn("id", downloadIDs)
		.where("user_id", "=", userID)
		.update({
			state: newState,
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.processingFailedForDownloads = function(userID, downloadIDs) {
	return _updateDownloadStateOnly(userID, downloadIDs, "processing-failed");
}

module.exports.uploadingFailedForDownloads = function(userID, downloadIDs) {
	return _updateDownloadStateOnly(userID, downloadIDs, "uploading-failed");
}

module.exports.uploadingDoneForDownloads = function(userID, downloadIDs) {
	return _updateDownloadStateOnly(userID, downloadIDs, "uploaded");
}

module.exports.getVideoCountNumber = function(userID) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("user_id", "=", userID)
		.whereNotNull("video_number")
		.orderBy("video_number", "DESC")
		.limit(1)
		.then(function(results) {
			if (results.length <= 0) {
				return resolve(1);
			} else {
				return resolve(parseInt(results[0].video_number) + 1);
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _getUsersVideosHelper(userID, offsetVal, limitVal) {
	return new Promise(function(resolve, reject) {
		return knex('youtube_videos')
		.select("*")
		.select(knex.raw("(select value from titles where user_id=?::text AND download_id=(select id from downloads where user_id=?::text AND video_number=youtube_videos.video_number ORDER BY (clip_stopped_downloading)::float DESC LIMIT 1)::text ) as title", [userID, userID]))
		.select(knex.raw("(select value from descriptions where user_id=?::text AND download_id=(select id from downloads where user_id=?::text AND video_number=youtube_videos.video_number ORDER BY (clip_stopped_downloading)::float DESC LIMIT 1)::text ) as description", [userID, userID]))
		.where("user_id", "=", userID)
		.orderBy("created_at", "DESC")
		.offset(offsetVal)
		.limit(limitVal)
		.then(function(results) {
			if (results.length == 0) {
				return resolve([]);
			} else {
				return resolve(results);
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _getUsersUnusedClipsHelper(userID, offsetVal, limitVal) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("user_id", "=", userID)
		.whereIn("state", ["preparing", "started", "done", "done-need-info"])
		.where("used", false)
		.where("deleted", false)
		.whereNull("video_number")
		.whereNull("deleted_at")
		.orderBy("created_at", "DESC")
		.offset(offsetVal)
		.limit(limitVal)
		.then(function(results) {
			if (results.length == 0) {
				return resolve([]);
			} else {

				// Remove all of the downloaded_file's if they dont have the CDN in them
	            for (var i = 0; i < results.length; i++) {
	                if (results[i].downloaded_file == null || results[i].downloaded_file.indexOf(Attr.CDN_URL) < 0) {
	                	delete results[i].downloaded_file;
	                }
	            }

				return resolve(results);
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.getUsersPublishedVideoPageInfo = function(userID) {
	return new Promise(function(resolve, reject) {
		return knex("youtube_videos")
		.where("user_id", "=", userID)
		.count('id as CNT')
		.then(function(total) {
			var totalVideosCount = parseInt(total[0].CNT);
			var totalPages = Math.ceil(totalVideosCount / PER_PAGE_ON_VIDEOS_TABLES);

			return resolve(totalPages);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.getUsersUnusedClipPageInfo = function(userID) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("user_id", "=", userID)
		.whereIn("state", ["preparing", "started", "done", "done-need-info"])
		.where("used", false)
		.where("deleted", false)
		.whereNull("video_number")
		.whereNull("deleted_at")
		.count('id as CNT')
		.then(function(total) {
			var totalVideosCount = parseInt(total[0].CNT);
			var totalPages = Math.ceil(totalVideosCount / PER_PAGE_ON_VIDEOS_TABLES);

			if (totalPages == 0) {
				totalPages = 1;
			}

			return resolve(totalPages);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.getUsersPreviousClipPageInfo = function(userID) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("user_id", "=", userID)
		.whereNotIn("state", ["preparing", "started", "done", "done-need-info"])
		.whereNotNull("downloaded_file")
		.whereNotExists(knex.select('*').from('need_to_be_deleted').whereRaw('downloads.id = need_to_be_deleted.download_id::integer AND deleted=true'))
		.count('id as CNT')
		.then(function(total) {
			var totalVideosCount = parseInt(total[0].CNT);
			var totalPages = Math.ceil(totalVideosCount / PER_PAGE_ON_VIDEOS_TABLES);

			if (totalPages == 0) {
				totalPages = 1;
			}

			return resolve(totalPages);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _getOffsetFromPageNumber(pageNumber) {
	// The offset is the page number * number on the page
	// The page number we subtract 1 from since we start counting with a base number of 1, counting upwards (1, 2, 3, ...)
	// So for the first page (1) we want no offset -> 0 * PER_PAGE_ON_VIDEOS_TABLES -> (page_number - 1) * PER_PAGE_ON_VIDEOS_TABLES
	// For the second page (2) we want offset of PER_PAGE_ON_VIDEOS_TABLES -> 1 * PER_PAGE_ON_VIDEOS_TABLES -> (page_number - 1) * PER_PAGE_ON_VIDEOS_TABLES
	// And onwards
	var offsetVal = (pageNumber - 1) * PER_PAGE_ON_VIDEOS_TABLES;
	return offsetVal;
}

module.exports.getUsersUnusedClipsPage = function(userID, pageNumber) {
	var offsetValue = _getOffsetFromPageNumber(pageNumber);
	return _getUsersUnusedClipsHelper(userID, offsetValue, PER_PAGE_ON_VIDEOS_TABLES);
}

module.exports.getUsersPublishedVideosPage = function(userID, pageNumber) {
	var offsetValue = _getOffsetFromPageNumber(pageNumber);
	return _getUsersVideosHelper(userID, offsetValue, PER_PAGE_ON_VIDEOS_TABLES);
}

module.exports.getUsersPublishedVideos = function(userID) {
	return _getUsersVideosHelper(userID, 0, PER_PAGE_ON_VIDEOS_TABLES);
}

module.exports.getUsersUnusedClips = function(userID) {
	return _getUsersUnusedClipsHelper(userID, 0, PER_PAGE_ON_VIDEOS_TABLES);
}

module.exports.insertIntoNeedToBeDeleted = function(row) {
	return new Promise(function(resolve, reject) {
		return knex('need_to_be_deleted')
		.insert(row)
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.updateNeedToBeDeleted = function(id, deletedVal) {
	return new Promise(function(resolve, reject) {
		return knex('need_to_be_deleted')
		.where("id", "=", id)
		.update({
			deleted: deletedVal,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _getUsersPreviousClipsHelper(userID, offsetVal, limitVal) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("user_id", "=", userID)
		.whereNotIn("state", ["preparing", "started", "done", "done-need-info"])
		.whereNotNull("downloaded_file")
		.whereNotExists(knex.select('*').from('need_to_be_deleted').whereRaw('downloads.id = need_to_be_deleted.download_id::integer AND deleted=true'))
		.orderBy("created_at", "DESC")
		.offset(offsetVal)
		.limit(limitVal)
		.then(function(results) {
			if (results.length == 0) {
				return resolve([]);
			} else {
				return resolve(results);
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.getUsersPreviousClipsPage = function(userID, pageNumber) {
	var offsetValue = _getOffsetFromPageNumber(pageNumber);
	return _getUsersPreviousClipsHelper(userID, offsetValue, PER_PAGE_ON_VIDEOS_TABLES);
}

module.exports.getUsersPreviousClips = function(userID) {
	return _getUsersPreviousClipsHelper(userID, 0, PER_PAGE_ON_VIDEOS_TABLES);
}

module.exports.setUsersChannelID = function(userID, channelID) {
	return new Promise(function(resolve, reject) {
		return knex('users')
		.where("id", "=", parseInt(userID))
		.update({
			channel_id: channelID,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.anyOtherUsersHaveChannelID = function(userID, ytChannelID) {
	return new Promise(function(resolve, reject) {
		return knex('users')
		.where("id", "!=", parseInt(userID))
		.where("banned", "=", false)
		.where("channel_id", "=", ytChannelID)		
		.count('id as CNT')
		.then(function(total) {
			var usersWithSameChannelID = parseInt(total[0].CNT);

			if (usersWithSameChannelID > 0) {
				return resolve(true);
			} else {
				return resolve(false);
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.banUser = function(userID, banReason) {
	return new Promise(function(resolve, reject) {
		return knex('users')
		.where("id", "=", parseInt(userID))
		.update({
			banned: true,
			banned_reason: banReason,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.updateIntroOutroFileLocationDeleteNonce = function(userID, pmsID, nonce, newFileLocation) {
	return new Promise(function(resolve, reject) {
		return knex('intros_or_outros')
		.where("user_id", "=", userID)
		.where("pms_user_id", "=", pmsID)
		.where("nonce", "=", nonce)
		.update({
			nonce: null,
			file_location: newFileLocation,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.insertIntroOrOutro = function(introOutroObj) {
	return new Promise(function(resolve, reject) {
		return knex('intros_or_outros')
		.insert(introOutroObj)
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.setIntroOutroDoneDownloading = function(userID, pmsID, nonce) {
	return new Promise(function(resolve, reject) {
		return knex('intros_or_outros')
		.where("user_id", "=", userID)
		.where("pms_user_id", "=", pmsID)
		.where("nonce", "=", nonce)
		.where("upload_failed", "=", false)
		.where("finished_uploading", "=", false)
		.update({
			finished_uploading: true,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.updateIntroOutroLastUpdated = function(userID, pmsID, nonce) {
	return new Promise(function(resolve, reject) {
		return knex('intros_or_outros')
		.where("user_id", "=", userID)
		.where("pms_user_id", "=", pmsID)
		.where("nonce", "=", nonce)
		.update({
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.deleteIntroOutroEntity = function(ID) {
	return new Promise(function(resolve, reject) {
		return knex('intros_or_outros')
		.where("id", "=", ID)
		.del()
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.setIntroOutroFailed = function(ID) {
	return new Promise(function(resolve, reject) {
		return knex('intros_or_outros')
		.where("id", "=", ID)
		.update({
			finished_uploading: true,
			upload_failed: true,
			file_location: "DELETED",
			nonce: null,
			updated_at: new Date()
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.doesActiveIntroOutroExist = function(userID, pmsID, nonce) {
	return new Promise(function(resolve, reject) {
		return knex('intros_or_outros')
		.where("user_id", "=", userID)
		.where("pms_user_id", "=", pmsID)
		.where("nonce", "=", nonce)
		.where("upload_failed", "=", false)
		.where("finished_uploading", "=", false)
		.then(function(results) {
			if (results.length > 0) {
				return resolve(results[0]);
			} else {
				return resolve(undefined);
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}
