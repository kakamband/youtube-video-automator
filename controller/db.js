var Promise = require('bluebird');
var cLogger = require('color-log');
var Secrets = require('../config/secrets');
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
			downloaded_file: fileLocation
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
					return Promise.resolve();
				})
				.catch(function(err) {
					return reject(err);
				});
			} else { // Update User
				if (users[0].email != email || users[0].password) {
					cLogger.info("Updating user, email or password is different.");
					return knex('users')
					.where('pms_user_id', '=', ID)
					.update({
						username: username,
						email: email,
						password: password,
						updated_at: new Date()
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
		knex('downloads')
		.where("id", "=", ID)
		.where("user_id", "=", userID)
		.where("game", "=", gameName)
		.where("twitch_link", "=", twitchLink)
		.orderBy("updated_at", "desc")
		.limit(1)
		.then(function(results) {
			if (results.length == 0) {
				cLogger.info("Can't seem to find a download db attribute??");
				// TODO add sentry error here

				return resolve(stop);
			}

			if (results[0].state != "init-stop") {
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

module.exports.addDownload = function(downloadObj) {
	return new Promise(function(resolve, reject) {
		knex('downloads')
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
