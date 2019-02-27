var Promise = require('bluebird');
var shell = require('shelljs');
var cLogger = require('color-log');
var dbController = require('../controller/db');

module.exports.downloadContent = function(content) {
	return new Promise(function(resolve, reject) {

		// Go into the video data directory
		shell.cd("video_data/");

		// Delete all the contents in this directory
		shell.exec("rm -R */");

		return new Promise.mapSeries(content.entries(), function(obj) {
			let gameName = obj[0];
			let clips = obj[1];

			// Create a directory for the game
			shell.mkdir(gameName);

			// Go into the game directory
			shell.cd(gameName + "/");

			return new Promise(function(res, rej) {
				cLogger.mark("Starting to download clips for " + gameName);
				return downloadEachClip(clips)
				.then(function() {

					// Leave the game directory
					shell.cd("..");

					console.log("\n");

					return res();
				})
				.catch(function(err) {
					return rej(err);
				});
			});
		})
		.then(function() {

			// Leave the video data directory
			shell.cd("..");

			return resolve(content);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function downloadEachClip(clips) {
	return new Promise(function(resolve, reject) {
		// If we couldn't find enough clips to make the video
		if (clips.length == 0) {
			return resolve();
		}

		return new Promise.mapSeries(clips, function(clip, index, len) {
			return new Promise(function(res, rej) {
				return shell.exec("youtube-dl -f best https://clips.twitch.tv/" + clip.vod_id + " -o clip-" + index + ".mp4 --external-downloader ffmpeg", function(code, stdout, stderr) {
					if (code != 0) {
						cLogger.error("Error downloading content: ", stderr);
						return rej();
					}

					return dbController.setUsed(clip)
					.then(function() {
						cLogger.info("Downloaded clip #" + index + " and added to used content in DB.");
						return res();
					})
					.catch(function(err) {
						return rej(err);
					});
				});
			});
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}
