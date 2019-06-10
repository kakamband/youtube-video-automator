var Promise = require('bluebird');
var shell = require('shelljs');
var cLogger = require('color-log');
var getDimensions = require('get-video-dimensions');
var Attr = require("../config/attributes");
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
var ffprobe = require('ffprobe');
ffprobeStatic = require('ffprobe-static');
var dbController = require('../controller/db');

module.exports.combineAllUsersClips = function(pmsID, folderLocation, toCombine, intro, outro) {
	return new Promise(function(resolve, reject) {

		if (toCombine.length == 0) return reject(new Error("There are no clips to combine."));
		
		if (toCombine.length == 1 && intro == null && outro == null) {
			// There is nothing to combine, so just rename it and continue
			var cmd = "mv " + folderLocation + "clip-0.mp4 " + folderLocation + Attr.FINISHED_FNAME + ".mp4";
			cLogger.info("Running CMD: " + cmd);
			return shell.exec(cmd, function(code, stdout, stderr) {
				if (code != 0) {
					cLogger.error("Error renaming singular clip: ", stderr);
					return reject(stderr);
				}

				return resolve();
			});
		} else {
			var maxWidth = 0;
			var maxHeight = 0;
			return getDimensionSizeWithPath(folderLocation, toCombine.length)
			.then(function(dimensions) {
				maxWidth = dimensions[0];
				maxHeight = dimensions[1];

				return dbController.getActiveSubscriptionWrapper(pmsID);
			})
			.then(function(subscriptionInfo) {
	            let activeSubscriptionID = subscriptionInfo[0];
	            let numberOfVideosLeft = subscriptionInfo[1];
	            let userBanned = subscriptionInfo[2];
	            let userBannedReason = subscriptionInfo[3];

	            var processingSpeed = "medium"; // Default is medium speed
	            if (activeSubscriptionID == "716") {
            		processingSpeed = "slow"; // Slow it down for professional users
	            }

				return executeCombiningWithPath(toCombine.length, maxWidth, maxHeight, folderLocation, processingSpeed, intro, outro);
			})
			.then(function() {
				return resolve();
			})
			.catch(function(err) {
				return reject(err);
			});
		}
	});
}

module.exports.combineHijackedContent = function(content) {
	return _combineContent(content, "video_data_hijacks/");
}

module.exports.combineContent = function(content) {
	return _combineContent(content, "video_data/");
}

function _combineContent(content, dir) {
	return new Promise(function(resolve, reject) {

		shell.cd(ORIGIN_PATH + dir);

		return new Promise.mapSeries(content.entries(), function(item, ind, len) {
			let gameName = item[0];
			let clips = item[1];
			let count = clips.length;

			// Enter the game directory
			shell.cd(ORIGIN_PATH + dir + gameName + "/");

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
			shell.cd(ORIGIN_PATH);

			return resolve(content);
		})
		.catch(function(err) {
			return reject(err);
		})
	});
}

function executeCombiningWithPath(count, maxWidth, maxHeight, actualPath, processingSpeed, intro, outro) {
	return new Promise(function(resolve, reject) {
		return shell.exec(ffmpegPath + createCommandWithPath(count, maxWidth, maxHeight, actualPath, processingSpeed, intro, outro), function(code, stdout, stderr) {
			if (code != 0) {
				cLogger.error("Error combining multiple clips: ", stderr);
				return reject(stderr);
			}

			// Remove all the uncombined clips. They are no longer needed.
			return shell.exec("rm " + actualPath + "clip-*.mp4", function(code, stdout, stderr) {
				return resolve();
			});
		});
	});
}

function executeCombining(count, maxWidth, maxHeight) {
	return new Promise(function(resolve, reject) {
		return shell.exec(ffmpegPath + createCommand(count, maxWidth, maxHeight), function(code, stdout, stderr) {
			if (code != 0) {
				cLogger.error("Error downloading content: ", stderr);
				return reject(stderr);
			}

			return shell.exec("rm clip-*.mp4 rm clip-*.txt", function(code, stdout, stderr) {
				shell.cd("..");
				return resolve();
			});
		});
	});
}

function extractWidthHeightFromVideo(pathToClip) {
	return new Promise(function(resolve, reject) {
		return ffprobe(pathToClip, {
			path: ffprobeStatic.path
		}, function(err, info) {
			if (err) {
				return reject(err);
			} else {

				if (!info || info.streams.length <= 0) {
					return resolve([0, 0]);
				} else {
					return resolve([info.streams[0].width, info.streams[0].height]);
				}
			}
		});
	});
}

function getDimensionSizeWithPath(actualPath, count) {
	return new Promise(function(resolve, reject) {
		var maxWidth = 0;
		var maxHeight = 0;

		var countIndex = 0;
		if (countIndex >= count) return reject(new Error("No files to get sizes from."));

		function next() {
			return extractWidthHeightFromVideo(actualPath + 'clip-' + countIndex + '.mp4').then(function(dimensions) {
				if (parseInt(dimensions[0]) >= maxWidth) {
					maxWidth = parseInt(dimensions[0]);
					maxHeight = parseInt(dimensions[1]);
				}

				countIndex++;
				if (countIndex <= count - 1) {
					return next();
				} else {
					if (maxWidth == 0 || maxHeight == 0) {
						return reject(new Error("Couldn't find a single max width or height..."));
					} else {
						return resolve([maxWidth, maxHeight]);
					}
				}
			});
		}

		return next();
	});
}

function getDimensionSize(count) {
	return getDimensionSizeWithPath("", count);
}

function createCommandWithPath(count, maxWidth, maxHeight, actualPath, processingSpeed, intro, outro) {
	var str = " ";

	var extraCountFromIntro = 0;
	// Include the intro at the start if it exists
	if (intro != null) {
		str += "-i " + actualPath + intro + " ";
		extraCountFromIntro = 1;
	}

	for (var i = 0; i < parseInt(count); i++) {
		str += "-i " + actualPath + "clip-" + i + ".mp4 ";
	}

	// Include the outro at the end if it exists
	if (outro != null) {
		str += "-i " + actualPath + outro + " ";
		count++;
	}
	count += extraCountFromIntro;

	str += "-filter_complex \""
	for (var i = 0; i < parseInt(count); i++) {
		str += "[" + i + ":v]scale=" + maxWidth + "x" + maxHeight + ",setpts=PTS-STARTPTS[v" + i + "];";
	}
	for (var i = 0; i < parseInt(count); i++) {
		str += "[v" + i + "][" + i + ":a]";
	}
	str += (" concat=n=" + count + ":v=1:a=1 [v][a]\" -map \"[v]\" -map \"[a]\" -preset " + processingSpeed + " " + actualPath + Attr.FINISHED_FNAME + ".mp4");
	return str;
}

function createCommand(count, maxWidth, maxHeight) {
	return createCommandWithPath(count, maxWidth, maxHeight, "", "medium", null, null);
}
