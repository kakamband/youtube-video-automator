var Promise = require('bluebird');
var shell = require('shelljs');
var cLogger = require('color-log');
var Attr = require('../config/attributes');
var dbController = require('../controller/db');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

module.exports.downloadEachAWSClip = function(userID, toDownload) {
	return new Promise(function(resolve, reject) {
		var currentDateTime = new Date();
		var folderPath = ORIGIN_PATH + "video_data_hijacks/" + userID + "-" + currentDateTime.getTime() + "/";

		// Make a directory for these downloads
		shell.mkdir(folderPath);

		// Start downloading each clip
		var count = 0;
		if (toDownload.length <= 0) return reject(new Error("Can't download no clips..."));

		function next() {
			return downloadClip(toDownload[count], folderPath, count)
			.then(function() {
				count++;
				if (count <= toDownload.length - 1) {
					return next();
				} else {
					return resolve(folderPath);
				}
			})
			.catch(function(err) {
				return reject(err);
			});
		}

		return next();
	});
}

function downloadClip(clipInfo, folderPath, clipNumber) {
	return new Promise(function(resolve, reject) {
		if (clipInfo.downloaded_file == null || clipInfo.downloaded_file == undefined) {
			return reject(new Error("The downloaded file could not be found!"));
		}

		var fileNameSplit = clipInfo.downloaded_file.split(Attr.CDN_URL);
		var fileNameActual = fileNameSplit[fileNameSplit.length - 1];
		fileNameActual = fileNameActual.substr(1); // Remove the leading '/'

		var cmd = "aws s3 cp s3://" + Attr.AWS_S3_BUCKET_NAME + fileNameActual + " " + folderPath + "clip-" + clipNumber + ".mp4";
		cLogger.info("Running CMD: " + cmd);
		return shell.exec(cmd, function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			return resolve();
		});
	});
}

module.exports.downloadContent = function(content) {
	return new Promise(function(resolve, reject) {

		// Go into the video data directory
		shell.cd(ORIGIN_PATH + "video_data/");

		// Delete all the contents in this directory
		shell.exec("rm -R */");

		return new Promise.mapSeries(content.entries(), function(obj) {
			let gameName = obj[0];
			let clips = obj[1];

			// Create a directory for the game
			shell.mkdir(gameName);

			// Go into the game directory
			shell.cd(ORIGIN_PATH + "video_data/" + gameName + "/");

			return new Promise(function(res, rej) {
				cLogger.mark("Starting to download clips for " + gameName);
				return downloadEachClip(clips)
				.then(function(resultingClips) {

					// Update the clips
					content.set(gameName, resultingClips);

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
			shell.cd(ORIGIN_PATH);

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
			return resolve(clips);
		}

		var offsetVal = 0;
		var resultingClips = [];
		return new Promise.mapSeries(clips, function(clip, index, len) {
			return new Promise(function(res, rej) {
				return shell.exec(ORIGIN_PATH + "youtube-dl -f best https://clips.twitch.tv/" + clip.vod_id + " -o clip-" + (index - offsetVal) + ".mp4 --external-downloader " + ffmpegPath, function(code, stdout, stderr) {
					if (code != 0) {
						cLogger.error("Error downloading content: ", stderr);
						cLogger.info("Not exitting, just not using this clip.");
						offsetVal++;
						return res();
					}

					resultingClips.push(clip);
					return dbController.setUsed(clip)
					.then(function() {
						cLogger.info("Downloaded clip #" + (index - offsetVal) + " and added to used content in DB.");
						return res();
					})
					.catch(function(err) {
						return rej(err);
					});
				});
			});
		})
		.then(function() {
			return resolve(resultingClips);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}
