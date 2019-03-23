var Promise = require('bluebird');
var cLogger = require('color-log');
var Hijacker = require('../hijacker/hijacker');

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// downloadContent
// Initiates a download of content for a user
module.exports.downloadContent = function(userID, gameName, twitchStream, downloadID) {
	return new Promise(function(resolve, reject) {
		cLogger.info("Starting to download content for user: " + userID + " and the following game and stream: " + gameName + " (" + twitchStream + ")");
		Hijacker.startHijack(userID, gameName, twitchStream, downloadID)
		.then(function() {
			cLogger.info("Done hijacking.");
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// decrementMsgCount
// Decrements the msg count in redis
module.exports.decrementMsgCount = function(key) {
	return decrKey(key);
}

// --------------------------------------------
// Exported compartmentalized functions above.
// --------------------------------------------
// Helper functions below.
// --------------------------------------------

function decrKey(key) {
	return new Promise(function(resolve, reject) {
		var multi = redis.multi();
		multi.decr(key);
		multi.exec(function (err, replies) {
		    return resolve();
		});
	});
}

// --------------------------------------------
// Helper functions above.
// --------------------------------------------