var Promise = require('bluebird');
var cLogger = require('color-log');
var Secrets = require('../config/secrets');
var ErrorHelper = require('../errors/errors');
const stripeProd = require('stripe')(Secrets.STRIPE_PROD_SECRET);
const stripeTest = require('stripe')(Secrets.STRIPE_TEST_SECRET);

module.exports.alreadyUsed = function(game, id, trackingID) {
	return new Promise(function(resolve, reject) {
		knex('used_content')
		.where("game", "=", game)
		.where("vod_id", "=", id)
		.where("tracking_id", "=", trackingID)
		.then(function(results) {
			if (results.length > 0) {
				return resolve(true);
			}
			return resolve(false);
		})
		.catch(function(err) {
			return reject(err);
		})
	});
}

module.exports.finishedDownloading = function(userID, gameName, twitchStream, downloadID, fileLocation) {
	return new Promise(function(resolve, reject) {
		knex('downloads')
		.where("id", "=", downloadID)
		.where("user_id", "=", userID)
		.where("twitch_link", "=", twitchStream)
		.where("game", "=", gameName)
		.update({
			state: "done",
			downloaded_file: fileLocation,
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

module.exports.initDownloadStop = function(userID, twitchLink, downloadID) {
	return new Promise(function(resolve, reject) {
		knex('downloads')
		.where("id", "=", downloadID)
		.where("user_id", "=", userID)
		.where("twitch_link", "=", twitchLink)
		.update({
			state: "init-stop",
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.doesUserExist = function(username, pmsID, email, password) {
	return new Promise(function(resolve, reject) {
		return knex('users')
		.where('username', '=', username)
		.where('pms_user_id', '=', pmsID)
		.where('email', '=', email)
		.where('password', '=', password)
		.returning("id")
		.then(function(user) {
			if (user.length > 0) {
				return resolve(user[0]);
			} else {
				return resolve(undefined);
			}
		})
		.catch(function(err) {
			return reject(err);
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
			return reject(err);
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
			return reject(err);
		});
	});
}

module.exports.setNotificationsSeen = function(pmsID, notificationNames) {
	return new Promise(function(resolve, reject) {
		return knex('notifications')
		.where("pms_user_id", "=", pmsID)
		.whereIn("notification", notificationNames)
		.update({
			seen: true,
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

module.exports.seenNotification = function(pmsID, notificationName) {
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
			return reject(err);
		});
	});
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
			return reject(err);
		});
	});
}

module.exports.getVideosNotifications = function(pmsID) {
	return getNotifications(pmsID, ["videos-intro", "currently-clipping"]);
}

module.exports.getDashboardNotifications = function(pmsID) {
	return getNotifications(pmsID, ["dashboard-intro"]);
}

module.exports.getAccountNotifications = function(pmsID) {
	return getNotifications(pmsID, ["account-intro", "currently-clipping"]);
}

module.exports.getDefaultsNotifications = function(pmsID) {
	return getNotifications(pmsID, ["defaults-intro", "currently-clipping"]);
}

module.exports.settingsOverview = function(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex
		.select(knex.raw('(select value from simple_default where pms_user_id=\'' + pmsID + '\' AND setting_name=\'minimum-length\') as min_vid_length'))
		.select(knex.raw('(select value from simple_default where pms_user_id=\'' + pmsID + '\' AND setting_name=\'maximum-length\') as max_vid_length'))
		.select(knex.raw('(select value from simple_default where pms_user_id=\'' + pmsID + '\' AND setting_name=\'default-like\') as default_like'))
		.select(knex.raw('(select value from simple_default where pms_user_id=\'' + pmsID + '\' AND setting_name=\'default-category\') as default_category'))
		.select(knex.raw('(select value from simple_default where pms_user_id=\'' + pmsID + '\' AND setting_name=\'default-language\') as default_language'))
		.select(knex.raw('(select count(*) from playlists where pms_user_id=\'' + pmsID + '\') as playlists_count'))
		.select(knex.raw('(select count(*) from comments where pms_user_id=\'' + pmsID + '\') as comments_count'))
		.select(knex.raw('(select count(*) from signatures where pms_user_id=\'' + pmsID + '\') as signatures_count'))
		.select(knex.raw('(select count(*) from tags where pms_user_id=\'' + pmsID + '\') as tags_count'))
		.select(knex.raw('(select count(*) from thumbnails where pms_user_id=\'' + pmsID + '\') as thumbnails_count'))
		.then(function(results) {
			if (results.length > 0) {
				return resolve(results[0]);
			} else {
				return resolve(null);
			}
		})
		.catch(function(err) {
			return reject(err);
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
			return reject(err);
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
			return reject(err);
		});
	});
}

module.exports.getComments = function(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex('comments')
		.where("pms_user_id", "=", pmsID)
		.then(function(results) {
			if (results.length >= 0) {
				return resolve(results);
			} else {
				return resolve([]);
			}
		})
		.catch(function(err) {
			return reject(err);
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
			return reject(err);
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
			return reject(err);
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
			return reject(err);
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
			return reject(err);
		});
	});
}

module.exports.removeTag = function(pmsID, gameName, tag) {
	return new Promise(function(resolve, reject) {
		return knex('tags')
		.where("pms_user_id", "=", pmsID)
		.where("game", "=", gameName)
		.where("tag", "=", tag)
		.del()
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.deleteThumbnail = function(pmsID, gameName, image) {
	return new Promise(function(resolve, reject) {
		return knex('thumbnails')
		.where("pms_user_id", "=", pmsID)
		.where("game", "=", gameName)
		.where("image_name", "=", image)
		.del()
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
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
			return reject(err);
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
			return reject(err);
		});
	});
}

module.exports.removeSignature = function(pmsID, gameName, signature) {
	return new Promise(function(resolve, reject) {
		return knex('signatures')
		.where("pms_user_id", "=", pmsID)
		.where("game", "=", gameName)
		.where("signature", "=", signature)
		.del()
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
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

module.exports.removeComment = function(pmsID, gameName, comment) {
	return new Promise(function(resolve, reject) {
		return knex('comments')
		.where("pms_user_id", "=", pmsID)
		.where("game", "=", gameName)
		.where("comment", "=", comment)
		.del()
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
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
			return reject(err);
		});
	});
}

module.exports.deletePlaylist = function(pmsID, gameName, playlistID) {
	return new Promise(function(resolve, reject) {
		return knex('playlists')
		.where("pms_user_id", "=", pmsID)
		.where("game", "=", gameName)
		.where("playlist_id", "=", playlistID)
		.del()
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
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
			return reject(err);
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
			return reject(err);
		});
	});
}

module.exports.createDownloadNotification = function(pmsID, contentStr) {
	return new Promise(function(resolve, reject) {
		return knex('notifications')
		.insert({
			pms_user_id: pmsID,
			notification: "currently-clipping",
			seen: false,
			content: contentStr,
			created_at: new Date(),
			updated_at: new Date()
		})
		.then(function(result) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.createOrUpdateUser = function(username, ID, email, password, payments, subs) {
	var subscriptions = JSON.parse(subs);

	return new Promise(function(resolve, reject) {
		knex('users')
		.where('username', '=', username)
		.where('pms_user_id', '=', ID)
		.returning(["email", "password"])
		.limit(1)
		.then(function(users) {
			if (users.length == 0) { // New User
				cLogger.info("Creating new user.");
				return knex('users')
				.insert({
					username: username,
					pms_user_id: ID,
					email: email,
					password: password,
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
					return Promise.resolve();
				})
				.catch(function(err) {
					return reject(err);
				});
			} else { // Update User
				if (users[0].email != email || users[0].password != password) {
					cLogger.info("Updating user, email or password is different.");
					return knex('users')
					.where('pms_user_id', '=', ID)
					.update({
						email: email,
						password: password,
						updated_at: new Date()
					})
					.then(function() {
						return updateRedisValidUserKey(username, ID, users[0].email, users[0].password, email, password, users[0].id);
					})
					.then(function() {
						return Promise.resolve();
					})
					.catch(function(err) {
						return reject(err);
					});
				} else {
					return Promise.resolve();
				}
			}
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
		.then(function(activeSubscription) {
			return resolve(activeSubscription);
		})
		.catch(function(err) {
			return reject(err);
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

function getCurrentActiveSubscription(pmsID) {
	return new Promise(function(resolve, reject) {
		return knex('payments')
		.returning("subscription_id")
		.where("pms_user_id", "=", pmsID)
		.whereRaw("updated_at >= (select date_trunc(\'day\', NOW() - interval \'1 month\'))")
		.orderBy("subscription_id", "DESC")
		.limit(1)
		.then(function(results) {
			if (results.length == 0) {
				return resolve(-1);
			}

			return resolve(results[0].subscription_id);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function addNewPayments(ID, paymentsRAW) {
	var payments = JSON.parse(paymentsRAW);

	return new Promise(function(resolve, reject) {
		if (payments.length == 0) {
			return resolve();
		}

		var count = 0;
		function next() {
			return knex('payments')
			.where('pms_user_id', '=', ID)
			.where('subscription_id', '=', payments[count].subscription_plan_id)
			.where('payment_gateway', '=', payments[count].payment_gateway)
			.returning('status')
			.then(function(result) {
				if (result.length == 0) {
					cLogger.info("Payment doesn't exist, verifying payment integrity with Stripe first.");
					return stripePaymentExists(payments[count].transaction_id)
					.then(function() {
						return insertPayment(ID, payments[count])
						.then(function() {
							count++;
							if (count < payments.length - 1) {
								return next();
							} else {
								return resolve();
							}
						})
						.catch(function(err) {
							return reject(err);
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
					if (result[0].status != payments[count].status) {
						cLogger.info("Payment already exists. Updating and Continuing.");
						return knex('payments')
						.where('pms_user_id', '=', ID)
						.where('subscription_id', '=', payments[count].subscription_plan_id)
						.where('payment_gateway', '=', payments[count].payment_gateway)
						.update({
							status: payments[count].status
						})
						.then(function() {
							count++;
							if (count < payments.length - 1) {
								return next();
							} else {
								return resolve();
							}
						})
						.catch(function(err) {
							return reject(err);
						});
					} else {
						cLogger.info("Payment already exists. Not updating since status is the same, Continuing.");
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
				return reject(err);
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
			return reject(err);
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
			.where('pms_user_id', '=', pmsID)
			.where('subscription_id', '=', subs[count].subscription_plan_id)
			.returning("status")
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
						return reject(err);
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
							return reject(err);
						});
					} else {
						cLogger.info("Not updating subscription because the status is the same.");
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
				return reject(err);
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
		.where("game", "=", gameName)
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
			return reject(err);
		});
	});
}

module.exports.getVideosToBeCombined = function(userID, downloadID, gameName) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "!=", downloadID)
		.where("user_id", "=", userID)
		.where("used", "=", false)
		.where("game", "=", gameName)
		.where("state", "=", "done")
		.orderBy("updated_at", "DESC")
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
			return reject(err);
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
			return reject(err);
		});
	});
}

module.exports.getDownload = function(userID, downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "=", downloadID)
		.where("user_id", "=", userID)
		.then(function(results) {
			if (results.length == 0) {
				return resolve(undefined);
			}
			return resolve(results[0]);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
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
			return reject(err);
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
			return reject(err);
		});
	});
}

module.exports.episodeCount = function(gameName) {
	return new Promise(function(resolve, reject) {
		knex('youtube_videos')
		.where("game", "=", gameName)
		.count('id as CNT')
		.then(function(total) {
			return resolve(total[0].CNT);
		})
		.catch(function(err) {
			return reject(err);
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
				.where("game", "=", gameName)
				.then(function(results2) {
					return resolve(results2);
				})
				.catch(function(err) {
					return reject(err);
				});
			});
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.getPlaylist = function(gameName, userID) {
	return new Promise(function(resolve, reject) {
		knex('playlists')
		.where("user_id", "=", userID)
		.where("game", "=", gameName)
		.limit(1)
		.then(function(result) {
			if (result.length > 0) {
				return resolve(result[0].playlist_id);
			}

			return resolve(null);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.getThumbnail = function(userID, gameName, hijacked, hijackedName) {
	return new Promise(function(resolve, reject) {
		if (hijacked) {
			return knex('thumbnails')
			.where("user_id", "=", userID)
			.where("game", "=", gameName)
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
						return reject(err);
					});
				} else {
					return resolve(result[0].image_name)
				}
			})
			.catch(function(err) {
				return reject(err);
			});
		} else {
			return findGameThumbnail(gameName, userID)
			.then(function(result) {
				return resolve(result);
			})
			.catch(function(err) {
				return reject(err);
			});
		}
	});
}

function findGameHijackedThumbnail(gameName, userID) {
	return new Promise(function(resolve, reject) {
		return knex('thumbnails')
		.where("user_id", "=", userID)
		.where("game", "=", gameName)
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
			return reject(err);
		});
	});
}

function findGameThumbnail(gameName, userID) {
	return new Promise(function(resolve, reject) {
		return knex('thumbnails')
		.where("user_id", "=", userID)
		.where("game", "=", gameName)
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
			return reject(err);
		});
	});
}

module.exports.addYoutubeVideo = function(youtubeObj) {
	return new Promise(function(resolve, reject) {
		knex('youtube_videos')
		.insert(youtubeObj)
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
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
			return reject(err);
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
			return reject(err);
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
			return reject(err);
		});
	});
}

module.exports.updateStateBasedOnTitleDesc = function(userID, downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('titles')
		.where("user_id", "=", userID)
		.where("download_id", "=", downloadID)
		.then(function(titleResults) {
			if (titleResults.length == 0 || (titleResults.length > 0 && (titleResults[0].value == null || titleResults[0].value = ""))) {
				// Couldn't find a valid title
				return setDownloadToDoneNeedInfo(userID, downloadID)
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(err);
				});
			} else {
				// Found a valid title, look for a description now
				return knex('descriptions')
				.where("user_id", "=", userID)
				.where("download_id", "=", downloadID)
				.then(function(descResults) {
					if (descResults.length == 0 || (descResults.length > 0 && (descResults[0].value == null || descResults[0].value = ""))) {
						// Couldn't find a valid description
						return setDownloadToDoneNeedInfo(userID, downloadID)
						.then(function() {
							return resolve();
						})
						.catch(function(err) {
							return reject(err);
						});
					} else {
						// Found both a valid title, and a valid description
						return resolve();
					}
				})
				.catch(function(err) {
					return reject(err);
				});
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function setDownloadToDoneNeedInfo(userID, downloadID) {
	return new Promise(function(resolve, reject) {
		return knex('downloads')
		.where("id", "=", downloadID)
		.where("user_id", "=", userID)
		.update({
			state: "done-need-info" // DO NOT UPDATE "updated_at" here since we use it to calculate download video length.
		})
		.then(function(results) {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}
