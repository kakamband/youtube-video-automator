var cLogger = require('color-log');
var Promise = require('bluebird');
var dbController = require('../controller/db');

var DefinedGames = {
	FORTNITE: "Fortnite",
	LEAGUE_OF_LEGENDS: "League of Legends",
	APEX_LEGENDS: "Apex Legends"
};

// Constants
const LIMIT_OF_CLIPS_TO_PULL = 100;
const MIN_VIDEO_DURATION = 420; // Default 420 (7 Minutes)
const MAX_VIDEO_DURATION = 650; // Default 650 (10 Minutes 50 Seconds)

module.exports.pollForClips = function() {
	return poller([DefinedGames.FORTNITE, DefinedGames.LEAGUE_OF_LEGENDS, DefinedGames.APEX_LEGENDS]);
}

function poller(games) {
	return new Promise(function(resolve, reject) {
		var clipsMap = new Map();

		return Promise.mapSeries(games, function(currGame) {
			return new Promise(function(res1, rej1) {
				cLogger.mark("Making request for the following game: " + currGame);
				return makeReq(currGame)
				.then(function(items) {
					return smartParse(items)
					.then(function(itemsParsed) {
						clipsMap.set(currGame, itemsParsed);
						console.log("\n");
						return res1()
					})
					.catch(function(err) {
						return rej1(err);
					});
				})
				.catch(function(err) {
					return rej1(err);
				});
			});
		})
		.then(function() {
			return resolve(clipsMap);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function makeReq(game) {
	return new Promise(function(resolve, reject) {
		return twitch.clips.top({
			limit: LIMIT_OF_CLIPS_TO_PULL,
			game: game
		}, (err, res) => {
			if (err) {
				cLogger.error(err);
				return reject(err);
			} else {
				return resolve(res);
			}
		});
	});
}

// Should parse the output from twitch and returns the content, and only the content that satisfy these requirements:
// Language='en' [FOR NOW ONLY!]
// Not used before for a previous video
// Max video length = 10 Min 50 Seconds. If anything lower just return that.
// Minium video length = 7 Min.
function smartParse(items) {
	var clips = items.clips;
	var chosenClips = [];
	var currentDuration = 0.0;

	return new Promise(function(resolve, reject) {
		return new Promise.mapSeries(clips, function(currClip) {
			return new Promise(function(res1, rej1) {

				// If we have the maximum duration we want already, return the clips to the high level promise.
				if (currentDuration >= MAX_VIDEO_DURATION)
					return resolve(chosenClips);

				// If this isn't an english vod then skip it
				if (currClip.language != 'en')
					return res1();

				return dbController.alreadyUsed(currClip.game, currClip.id, currClip.tracking_id)
				.then(function(alreadyUsed) {
					if (!alreadyUsed && currClip != null && currClip.vod != null) {
						var newClipObj = createClipObject(
							currClip.game, 
							currClip.id, 
							currClip.tracking_id, 
							currClip.url,
							currClip.title, 
							currClip.views,
							currClip.duration,
							currClip.created_at,
							currClip.broadcaster.name,
							currClip.vod.url);

						chosenClips.push(newClipObj);
						currentDuration += newClipObj.duration;
						cLogger.info("[" + newClipObj.game + "]: Added a new clip object. The new duration is: " + currentDuration + " and the amount of clips are: " + chosenClips.length);
					}

					return res1();
				})
				.catch(function(err) {
					return reject(err);
				});
			});
		})
		.then(function() {

			// If the current duration is less than our minimum video length we dont return anything.
			if (currentDuration < MIN_VIDEO_DURATION) {
				return resolve([]);
			}

			// We have a video that is in the range of 7Min - 10 Min 50Sec.
			return resolve(chosenClips);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function createClipObject(gameName, ID, trackingID, clipURL, clipTitle, viewCount, dur, clipCreatedAt, clipChannelName, vodURL) {
	return {
		game: gameName,
		vod_id: ID,
		tracking_id: trackingID,
		clip_url: clipURL,
		title: clipTitle,
		views: viewCount,
		duration: dur,
		clip_created_at: clipCreatedAt,
		clip_channel_name: clipChannelName,
		vod_url: vodURL,
		created_at: new Date(),
		updated_at: new Date()
	};
}
