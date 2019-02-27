var Promise = require('bluebird');

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
