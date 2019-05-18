var Promise = require("bluebird");
var Attr = require('../config/attributes');
var cLogger = require('color-log');
var dbController = require('../controller/db');

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// addUsersDefaultComment
// Adds a default comment to a video + channel combination. This is not a replying comment.
module.exports.addUsersDefaultComment = function(youtube, videoID, channelID, gameName, pmsID) {
	return _attemptToAddUserComment(youtube, videoID, channelID, gameName, pmsID);
}

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

function _getRandomComment(commentList) {
	return new Promise(function(resolve, reject) {
		var count = 0;
		const maxRandIterations = 2;

		function getRandomIndex() {
			return Math.floor(Math.random() * Math.floor(commentList.length));
		}

		function next() {
			var randInd = getRandomIndex();
			count++;

			// Iterate twice to add a bit more randomness here
			if (count < maxRandIterations) {
				return next();
			} else {
				cLogger.info("Choosing random comment at index: " + randInd + " from a total of " + commentList.length + " comments.");
				return resolve(commentList[randInd]);
			}
		}

		return next();
	});
}

function _insertCommentHelper(youtube, channelID, videoID, commentText) {
	return new Promise(function(resolve, reject) {
		return youtube.commentThreads.insert({
			part: "snippet",
			requestBody: {
				snippet: {
					channelId: channelID,
					videoId: videoID,
					topLevelComment: {
						snippet: {
							textOriginal: commentText,
						}
					}
				}
			},
		}, (err, resp) => {
			if (err) {
				return reject(err);
			}

			cLogger.info("Comment succesfully added!");
			return resolve(resp.data);
		});
	});
}

function _attemptToAddUserComment(youtube, videoID, channelID, gameName, pmsID) {
	return new Promise(function(resolve, reject) {
		var postedComment = null;

		return dbController.getCommentsForGame(pmsID, gameName)
		.then(function(results) {
			if (results.length == 0) {
				return resolve(); // No comments to add.
			} else {
				return _getRandomComment(results);
			}
		})
		.then(function(chosenComment) {
			postedComment = chosenComment;
			return _insertCommentHelper(youtube, channelID, videoID, postedComment.comment);
		})
		.then(function(postedCommentResp) {
			return dbController.postedComment(pmsID, gameName, postedComment.comment, postedComment.id, postedCommentResp.id);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

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
