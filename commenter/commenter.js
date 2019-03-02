var Promise = require("bluebird");
var Attr = require('../config/attributes');
var cLogger = require('color-log');

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// addDefaultComment
// Adds a default comment to video + channel combination. This is not a replying comment.
module.exports.addDefaultComment = function(youtube, videoID, channelID, gameName) {
	return attemptToAddDefaultComment(youtube, videoID, channelID, gameName);
}

// --------------------------------------------
// Exported compartmentalized functions above.
// --------------------------------------------
// Helper functions below.
// --------------------------------------------

function attemptToAddDefaultComment(youtube, videoID, channelID, gameName) {
	return new Promise(function(resolve, reject) {
		var gamePotentialComments = Attr.DEFAULT_COMMENT_TEXT.get(gameName);

		if (gamePotentialComments == undefined || (gamePotentialComments != undefined && gamePotentialComments.length == 0)) {
			cLogger.info("Couldn't find any potential comments for the following game: " + gameName);
			return resolve();
		}

		var randomComment = Math.floor(Math.random() * gamePotentialComments.length);
		cLogger.info("Choosing comment at index: " + randomComment + " for a total possibility of " + gamePotentialComments.length + " comments.");
		return youtube.commentThreads.insert({
			part: "snippet",
			requestBody: {
				snippet: {
					channelId: channelID,
					videoId: videoID,
					topLevelComment: {
						snippet: {
							textOriginal: gamePotentialComments[randomComment],
						}
					}
				}
			},
		}, (err, resp) => {
			if (err) {
				return reject(err);
			}

			cLogger.info("Comment succesfully added!");
			return resolve();
		});
	});
}
