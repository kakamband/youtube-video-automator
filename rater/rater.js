var Promise = require('bluebird');
var cLogger = require('color-log');

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// likeVideo
// Adds a like to the video
module.exports.likeVideo = function(youtube, videoID) {
	return rateVideo(youtube, videoID, "like");
}

// dislikeVideo
// Adds a dislike to the video
module.exports.dislikeVideo = function(youtube, videoID) {
	return rateVideo(youtube, videoID, "dislike");
}

// --------------------------------------------
// Exported compartmentalized functions above.
// --------------------------------------------
// Helper functions below.
// --------------------------------------------

function rateVideo(youtube, videoID, ratingVal) {
	return new Promise(function(resolve, reject) {
		return youtube.videos.rate({
			id: videoID,
			rating: ratingVal
		}, (err, resp) => {
			if (err) {
				return reject(err);
			}

			cLogger.info("Rating succesfully added!");
			return resolve();
		});
	});
}

// --------------------------------------------
// Helper functions above.
// --------------------------------------------