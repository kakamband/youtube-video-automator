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