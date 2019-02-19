var Promise = require('bluebird');
var shell = require('shelljs');
var cLogger = require('color-log');
var getDimensions = require('get-video-dimensions');

module.exports.combineContent = function(clipsLenMap) {
	return new Promise(function(resolve, reject) {

		shell.cd("video_data/");

		return new Promise.mapSeries(clipsLenMap.entries(), function(item, ind, len) {
			let gameName = item[0];
			let count = item[1];

			// Enter the game directory
			shell.cd(gameName + "/");

			return new Promise(function(res, rej) {
				cLogger.info("Combining " + count + " videos of " + gameName + " now.");

				return getDimensionSize(count)
				.then(function(dimensions) {
					let maxWidth = dimensions[0];
					let maxHeight = dimensions[1];

					return executeCombining(count, maxWidth, maxHeight)
					.then(function() {
						return res();
					})
					.catch(function(err) {
						return reject(err);
					});
				})
				.catch(function(err) {
					return reject(err);
				});
			});
		})
		.then(function() {

			// Leave the video data directory
			shell.cd("..");

			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		})
	});
}

function executeCombining(count, maxWidth, maxHeight) {
	return new Promise(function(resolve, reject) {
		return shell.exec(createCommand(count, maxWidth, maxHeight), function(code, stdout, stderr) {
			if (code != 0) {
				cLogger.error("Error downloading content: ", stderr);
				return reject(stderr);
			}

			return shell.exec("rm clip-*.mp4", function(code, stdout, stderr) {
				shell.cd("..");
				return resolve();
			});
		});
	});
}

function getDimensionSize(count) {
	return new Promise(function(resolve, reject) {
		var maxWidth = 0;
		var maxHeight = 0;
		return new Promise.mapSeries(new Array(count), function(item, index, len) {
			return new Promise(function(res, rej) {
				getDimensions('clip-' + index + '.mp4').then(function(dimensions) {
					if (parseInt(dimensions.width) >= maxWidth) {
						maxWidth = parseInt(dimensions.width);
						maxHeight = parseInt(dimensions.height);
					}
					return res();
				});
			});
		})
		.then(function() {
			cLogger.info("Found a maxWidth of: " + maxWidth + " and a maxHeight of: " + maxHeight);
			return resolve([maxWidth, maxHeight]);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function createCommand(count, maxWidth, maxHeight) {
	var str = "ffmpeg ";
	for (var i = 0; i < parseInt(count); i++) {
		str += "-i clip-" + i + ".mp4 ";
	}
	str += "-filter_complex \""
	for (var i = 0; i < parseInt(count); i++) {
		str += "[" + i + ":v]scale=" + maxWidth + "x" + maxHeight + ",setpts=PTS-STARTPTS[v" + i + "];";
	}
	for (var i = 0; i < parseInt(count); i++) {
		str += "[v" + i + "][" + i + ":a]";
	}
	str += (" concat=n=" + count + ":v=1:a=1 [v][a]\" -map \"[v]\" -map \"[a]\" -preset ultrafast finished.mkv");
	return str;
}
