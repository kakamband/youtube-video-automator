var Promise = require('bluebird');
var cLogger = require('color-log');

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

module.exports.finishedDownloading = function(userID, gameName, twitchStream, downloadID) {
	return new Promise(function(resolve, reject) {
		knex('downloads')
		.where("id", "=", downloadID)
		.where("user_id", "=", userID)
		.where("twitch_link", "=", twitchStream)
		.where("game", "=", gameName)
		.update({
			state: "done",
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

module.exports.getPlaylist = function(gameName) {
	return new Promise(function(resolve, reject) {
		knex('playlists')
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

module.exports.getThumbnail = function(gameName, hijacked, hijackedName) {
	return new Promise(function(resolve, reject) {
		if (hijacked) {
			return knex('thumbnails')
			.where("game", "=", gameName)
			.where("hijacked", "=", true)
			.where("hijacked_name", "=", hijackedName)
			.orderBy("created_at", "desc")
			.limit(1)
			.then(function(result) {
				if (result.length == 0) {
					return findGameHijackedThumbnail(gameName)
					.then(function(result1) {
						if (result1 != null) {
							return resolve(result1);
						}
						return findGameThumbnail(gameName);
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
			return findGameThumbnail(gameName)
			.then(function(result) {
				return resolve(result);
			})
			.catch(function(err) {
				return reject(err);
			});
		}
	});
}

function findGameHijackedThumbnail(gameName) {
	return new Promise(function(resolve, reject) {
		return knex('thumbnails')
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

function findGameThumbnail(gameName) {
	return new Promise(function(resolve, reject) {
		return knex('thumbnails')
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

module.exports.addRefreshToken = function(clientID, refreshTkn, accessTkn) {
	return new Promise(function(resolve, reject) {
		knex('user_tokens')
		.insert({
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
