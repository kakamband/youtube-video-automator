var Promise = require('bluebird');
var cLogger = require('color-log');
const readline = require('readline');
var shell = require('shelljs');
var Attr = require('../config/attributes');
const base64url = require('base64url');
var ErrorHelper = require('../errors/errors');
const { getVideoDurationInSeconds } = require('get-video-duration');
var fs = require('fs');
var Combiner = require('../combiner/combiner');
var Uploader = require('../uploader/uploader');
var dbController = require('../controller/db');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
var sha256 = require('sha256');

const redisDownloadKey = "download_in_progress_id_";
const redisDownloadTTL = 1800; // 30 Minutes.

module.exports.startHijacking = function() {
	return new Promise(function(resolve, reject) {
		const rl = readline.createInterface({
		  input: process.stdin,
		  output: process.stdout,
		  terminal: false
		});

		// Go into the video_data_hijacks directory
		shell.cd(ORIGIN_PATH + "video_data_hijacks/");

		return rl.question('Enter the Twitch TV stream you want to hijack (ex. \"https://www.twitch.tv/tfue\"): ', (twitchStream) => {
			cLogger.info("The user entered: " + twitchStream);

			function next() {
				return getCurrentStreamGame(twitchStream)
				.then(function(game) {
					cLogger.info("This stream is currently playing the following game: " + game);
					return processHijack(game, twitchStream)
					.then(function(uploadIt) {
						if (uploadIt) {
							return attemptUpload(game);
						} else {
							rl.close();
							return resolve();
						}
					})
					.then(function() {
						rl.close();
						return resolve();
					})
					.catch(function(err) {
						return reject(err);
					});
				})
				.catch(function(err) {
					return reject(err);
				});
			}
			
			next();
		});
	});
}

module.exports.getClipGame = function(twitchStream) {
	return getCurrentStreamGame(twitchStream);
}

module.exports.endHijacking = function(userID, twitchStream, downloadID) {
	return new Promise(function(resolve, reject) {
		redis.set((redisDownloadKey + downloadID), "stop", "EX", redisDownloadTTL);
		return dbController.initDownloadStop(userID, twitchStream, downloadID)
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function getStreamPlaylistLink(twitchStream) {
	return new Promise(function(resolve, reject) {
		var cmd = ORIGIN_PATH + 'youtube-dl -f \\(\"bestvideo[width>=1920]\"/bestvideo\\)+bestaudio/best -g ' + twitchStream;
		return shell.exec(cmd, function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			return resolve(stdout.replace(/\r?\n|\r/g, ""));
		});
	});
}

function _spawnDownloadProcess(twitchStream, cmd, args1, args2) {
	var spawn = require('child_process').spawn;
	return new Promise(function(resolve, reject) {
		return getStreamPlaylistLink(twitchStream)
		.then(function(playlistLINK) {
			var totalArgs = args1;
			totalArgs = totalArgs.concat([playlistLINK]);
			totalArgs = totalArgs.concat(args2);

			var cProcess = spawn(cmd, totalArgs);
			return resolve(cProcess);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function spawnDownloadProcess(twitchStream, fileName) {
  	var downloadInitCMD = ffmpegPath;
	var downloadCMDArgs = ["-c", "copy", "-preset", "medium", (fileName + '.mp4')];
	return _spawnDownloadProcess(twitchStream, downloadInitCMD, ["-i"], downloadCMDArgs)
}

function _startADDownload(twitchStream) {
	return new Promise(function(resolve, _) {
		var epoch = (new Date).getTime();
		var fileName = ORIGIN_PATH + "tmp_ad_content/tmp_" + epoch;
		cLogger.info("Starting the AD buster download.");
		return spawnDownloadProcess(twitchStream, fileName)
		.then(function(cProcess) {
			return resolve([cProcess, fileName]);
		})
		.catch(function(err) {
			return reject(err);
		})
	});
}

function extractSeconds(line) {
	return new Promise(function(resolve, reject) {
		// Template of the time is: "frame= 1167 fps= 83 q=-1.0 size=   19200kB time=00:00:19.45 bitrate=8083.1kbits/s speed=1.38x"

		var splitOnTime = line.split("time=");
		var splitOnTimeAndSpace = splitOnTime[splitOnTime.length - 1].split(" ");
		var timeStr = splitOnTimeAndSpace[0];
		var timeStrSplit = timeStr.split(":");

		// Get the hours
		var hourSeconds = parseInt(timeStrSplit[0]) * 60 * 60; // Hours * 60min/hr * 60sec/min
		var minuteSeconds = parseInt(timeStrSplit[1]) * 60; // Minutes * 60sec/min
		var seconds = parseInt(timeStrSplit[2]); // Seconds

		return resolve(hourSeconds + minuteSeconds + seconds);
	});
}

// Polls the process every 2 seconds, to check for an AD. Goes up to 16 times (ie. 32 seconds)
// If it finds an it returns 
function _ADPoller(cProcess) {
	const pollingInterval = 2000; // 2 seconds

	return new Promise(function(resolve, reject) {
		var lastLine = "";
		cProcess.stderr.on('data', (data) => {
			if (data.indexOf("time=") >= 0) {
				lastLine = data.toString();
			}
		});

		var count = 0;
		var max = 16;

		// Start polling
		cLogger.info("Starting to poll video every " + (pollingInterval / 1000) + " seconds.");
		var pollInterval = setInterval(function() {
			return extractSeconds(lastLine)
			.then(function(secs) {
				// If the video is ever greater than 5 minutes than we know that an AD has been added, and the video gets corrupted.
				// This is an event I have been able to reproduce on every singe AD.
				if (secs >= 300) {
					return resolve(false);
				} else {
					count++;
					if (count > max) {
						return resolve(true);
					} else {
						// No AD found at (count * 2) seconds. Continuing.
						cLogger.mark("No AD at time: " + (count * 2) + " seconds.");
					}
				}
			});
		}, pollingInterval);
	});
}

function _startDownloadCheckHelper(twitchStream, currentAtmpts, maxAtmpts) {
	return new Promise(function(resolve, reject) {
		return _startADDownload(twitchStream)
		.then(function(processVals) {
			let cProcess = processVals[0];
			let fileName = processVals[1];
			var processStart = new Date();

			// Check if an AD appears in 32 seconds
			return _ADPoller(cProcess)
			.then(function(success) {
				if (success) {
					cLogger.info("No AD detected. Can Continue.");
					return resolve([cProcess, fileName, processStart]);
				} else {					
					if (currentAtmpts > maxAtmpts) {
						return reject(new Error("Couldn't start a clip without an AD. We are losing this customer."));
					}

					// Delay 7 seconds to get the AD out of the way
					cLogger.info("Watching AD for another 7 seconds to mimic a user watching it.");
					return setTimeout(function() {
						cLogger.info("Restarting download due to AD.");
						return _startDownloadCheckHelper(twitchStream, currentAtmpts + 1, maxAtmpts)
						.then(function(results) {
							return resolve(results);
						})
						.catch(function(err) {
							return reject(err);
						});
					}, 7000);
				}
			})
			.catch(function(err) {
				return reject(err);
			});
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _startDownloadCheckForADS(twitchStream) {
	return _startDownloadCheckHelper(twitchStream, 0, 5);
}

// Handles all the logic related to trying to get around Twitch ads.
// As of now this simply starts the stream, and kills it 1 second later.
// Doing this will usually (hypothetically) get the AD out of the way for the actual stream hijack.
module.exports.ADBuster = function(twitchStream) {
	const initialADTime = 7000; // 7 seconds
	const maxADRetries = 15;

	return _startDownloadCheckForADS(twitchStream);
}

function deleteTempADDownload(adFileName) {
	return new Promise(function(resolve, reject) {
		var rmCMD = "rm " + adFileName + ".mp4";
		return shell.exec(rmCMD, function(code, stdout, stderr) {
			if (code != 0) {
				ErrorHelper.scopeConfigure("hijacker.deleteTempADDownload", {ouput: stderr});
				ErrorHelper.emitSimpleError(new Error("Deleting the temporary AD file has errored, need to manually do this."));
			}

			return resolve();
		});
	});
}

module.exports.startHijack = function(userID, gameName, twitchStream, downloadID, cProcess, fileName, processStart) {
	return new Promise(function(resolve, reject) {
		var gameNameFolder = sha256(gameName);

		var lsCMD = ("ls " + ORIGIN_PATH + "video_data_hijacks/" + " | grep \"" + gameNameFolder + "\"");
		cLogger.info("Running command: " + lsCMD);
		return shell.exec(lsCMD, function(code, stdout, stderr) {
			if (code != 0) {
				shell.mkdir(ORIGIN_PATH + "video_data_hijacks/" + gameNameFolder);
				cLogger.info("No folder for (" + gameName + ") " + gameNameFolder + " creating it.");
			}

			var hijacking = false;
			var endingHijack = false;

			// The new file location where we are moving the temporary file
			var epoch = processStart.getTime();
			var newFileLocation = ORIGIN_PATH + "video_data_hijacks/" + gameNameFolder + "/" + userID + "_" + epoch;

			function next() {
				if (!hijacking) { // Start the hijack now.
					redis.set((redisDownloadKey + downloadID), "active", "EX", redisDownloadTTL);
			  		hijacking = true;

					return dbController.setDownloadActive(downloadID, (fileName + ".mp4"), processStart)
			  		.then(function() {
				  		return setTimeout(function() {
				  			return next();
				  		}, 4000);
			  		})
			  		.catch(function(err) {
			  			return reject(err);
			  		});
				} else { // We are already hijacking now. Check if we need to terminate every 1 second.
					return stopHelper(userID, gameName, twitchStream, downloadID)
					.then(function() {
						cProcess.kill();
						return dbController.finishedDownloading(userID, gameName, twitchStream, downloadID, (fileName + ".mp4"))
						.then(function() {
							return resolve();
						})
						.catch(function(err) {
							ErrorHelper.scopeConfigure("hijacker.startHijack", {
								user_id: userID,
								game: gameName,
								twitch_stream: twitchStream,
								download_id: downloadID
							});
							ErrorHelper.emitSimpleError(err);

							return reject(err);
						});
					})
					.catch(function(err) {
						return reject(err);
					});
				}
			}

			var mvCMD = "mv " + fileName + ".mp4 " + newFileLocation + ".mp4";
			fileName = newFileLocation;
			cLogger.info("Running command: " + mvCMD);
			return shell.exec(mvCMD, function(code, stdout, stderr) {
				if (code != 0) {
					return reject(stderr);
				}

				return next();
			})
		});
	});
}

function stopHelper(userID, gameName, twitchStream, downloadID) {
	var pollingInterval = 2000; // 2 seconds
	var maxPolls = 750; // 25 minutes max. Maybe change this in the future for Professional Youtubers.
	var currentPolls = 0;
	var redisKey = (redisDownloadKey + downloadID);

	return new Promise(function(resolve, reject) {
		function next() {
			return redis.get(redisKey, function(err, reply) {
				if (!err && reply != null) {
					cLogger.info("Checking if we need to stop through Redis.");
					if (reply.toString() == "active") {
						if (currentPolls >= maxPolls) {
							cLogger.error("Have timed out! This is bad for resources, and should be avoided at all costs!");
							ErrorHelper.scopeConfigure("hijacker.stopHelper (REDIS)", {
								user_id: userID,
								game: gameName,
								twitch_stream: twitchStream,
								download_id: downloadID
							});
							ErrorHelper.emitSimpleError(new Error("Have timed out! This is bad for resources, and should be avoided at all costs!"));

							return resolve();
						} else {
							return Promise.delay(pollingInterval)
							.then(function() {
								currentPolls++;
								return next();
							});
						}
					} else {
						redis.del(redisKey);
						return resolve();
					}
				} else {
					cLogger.info("Checking if we need to stop through the DB.");
					return dbController.needToStopDownload(userID, gameName, twitchStream, downloadID)
					.then(function(stop) {
						if (stop) {
							return resolve();
						} else if (currentPolls >= maxPolls) { // Timeout
							cLogger.error("Have timed out! This is bad for resources, and should be avoided at all costs!");
							ErrorHelper.scopeConfigure("hijacker.stopHelper (DB)", {
								user_id: userID,
								game: gameName,
								twitch_stream: twitchStream,
								download_id: downloadID
							});
							ErrorHelper.emitSimpleError(new Error("Have timed out! This is bad for resources, and should be avoided at all costs!"));

							return resolve();
						} else {
							return Promise.delay(pollingInterval) // Delay 2 seconds between checks to terminate.
							.then(function() {
								currentPolls++;
								return next();
							});
						}
					})
					.catch(function(err) {
						return reject(err);
					});
				}
			});
		}

		return next();
	});
}

// The starting point of this function should be in 'video_data_hijacks/GameName/'
function attemptUpload(gameName) {
	return new Promise(function(resolve, reject) {
		cLogger.info("\n\nDone processing. Attempting to do an upload now.");
		var lsCMD = ("ls *.mp4");
		cLogger.info("Running command: " + lsCMD);
		return shell.exec(lsCMD, function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			var files = stdout.split("\n");
			files.pop(); // Remove empty file
			var count = 0;

			// Start putting videos together to combine
			var videosToCombine = [];
			var currentDuration = 0;

			// TODO: See if we can upload a video. Either by combining videos or by uploading a single video.
			function next() {
				return checkFileDurations(files[count])
				.then(function(duration) {

					// Add these videos to the list
					currentDuration += duration;
					videosToCombine.push(files[count]);

					if (currentDuration >= Attr.MIN_V_LENGTH) {
						cLogger.info("Have enough content! Building a new file combining " + videosToCombine.length + " clips with a duration of: " + currentDuration + " seconds.");
						if (videosToCombine.length == 1) { // A single video, so no combining
							return buildContent(videosToCombine, gameName)
							.then(function(content) {
								return renameSingleContent(content);
							})
							.then(function(content) {
								shell.cd(ORIGIN_PATH); // Leave the game directory, and the video_data_hijacks directory.
								return Uploader.uploadHijackedVideos(content);
							})
							.then(function() {
								shell.cd(ORIGIN_PATH + "video_data_hijacks/" + gameName + "/"); // Enter the game directory
								cLogger.info("Done uploading video! Deleting the file now to save space and to not reupload.");
								return deleteFinishedVod();
							})
							.then(function() {
								shell.cd(ORIGIN_PATH); // Leave the video_data_hijacks directory
								return resolve();
							})
							.catch(function(err) {
								return reject(err);
							});
						} else { // More than one video, so combining is needed.
							return buildContent(videosToCombine, gameName)
							.then(function(content) {
								shell.cd(ORIGIN_PATH); // Leave the game directory, and the video_data_hijacks directory.
								return Combiner.combineHijackedContent(content);
							})
							.then(function(content) {
								cLogger.mark("Finished combining!");
								return Uploader.uploadHijackedVideos(content);
							})
							.then(function() {
								shell.cd(ORIGIN_PATH + "video_data_hijacks/" + gameName + "/"); // Enter the game directory
								cLogger.info("Done uploading video! Deleting the file now to save space and to not reupload.");
								return deleteFinishedVod();
							})
							.then(function() {
								shell.cd(ORIGIN_PATH); // Leave the video_data_hijacks directory
								return resolve();
							})
							.catch(function(err) {
								return reject(err);
							});
						}
					} else if (count < (files.length - 1)) {
						count++;
						next();
					} else {
						cLogger.mark("We could only find a combined duration of " + currentDuration + " seconds, which is not enough to create a video.");
						return resolve();
					}
				})
				.catch(function(err) {
					return reject(err);
				});
			}

			next();
		});
	});
}

function deleteFinishedVod() {
	return new Promise(function(resolve, reject) {
		var rmCMD = "rm finished.mp4";
		cLogger.info("Running command: " + rmCMD);
		return shell.exec(rmCMD, function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			return resolve();
		});
	});
}

function renameSingleContent(content) {
	return new Promise(function(resolve, reject) {
		var mvCMD = "mv clip-0.mp4 " + Attr.FINISHED_FNAME + ".mp4";
		cLogger.info("Running command: " + mvCMD);
		return shell.exec(mvCMD, function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			var rmCMD = "rm clip-0.txt";
			cLogger.info("Running command: " + rmCMD);
			return shell.exec(rmCMD, function(code, stdout, stderr) {
				if (code != 0) {
					return reject(stderr);
				}

				return resolve(content);
			});
		});
	});
}

function checkFileDurations(file) {
	return new Promise(function(resolve, reject) {
		return getVideoDurationInSeconds(file).then((duration) => {
			cLogger.info("File " + file + " has video length of: " + duration + " seconds.");
			return resolve(duration);
		});
	});
}

function processHijack(gameName, twitchStream) {
	return new Promise(function(resolve, reject) {
		var lsCMD = ("ls | grep \"" + gameName + "\"");
		cLogger.info("Running command: " + lsCMD);
		return shell.exec(lsCMD, function(code, stdout, stderr) {
			if (code != 0) {
				shell.mkdir(gameName);
				cLogger.info("No folder for " + gameName + " creating it.");
			}

			shell.cd(ORIGIN_PATH + "video_data_hijacks/" + gameName + "/");

			// Ask to initiate the hijack
			cLogger.mark("\nPress any key to start hijacking.\n");
			process.stdin.setRawMode(true);

			var hijacking = false;
			var cProcess = null;
			var fileName = null;
			var endingHijack = false;

			return process.stdin.on('data', function(data) {
			  	if (hijacking) {
			  		cLogger.info("Ending the hijack in 5 Seconds (give some leeway)!");
			  		hijacking = false;

			  		if (cProcess != null) {
			  			endingHijack = true;
			  			return endHijack(gameName, twitchStream, cProcess, fileName)
			  			.then(function(uploadIt) {
			  				return resolve(uploadIt);
			  			})
			  			.catch(function(err) {
			  				return reject(err);
			  			});
			  		}
			  	} else if (!endingHijack && !hijacking) {
					cLogger.info("Starting the hijack! You will see some text appear shortly. Press Enter again to stop the hijack.");
			  		hijacking = true;

			  		var epoch = (new Date).getTime();
			  		fileName = "finished-" + epoch;

			  		cProcess = shell.exec(ffmpegPath + ' -i $(' + ORIGIN_PATH + 'youtube-dl -f best -g ' + twitchStream + ') -c copy -preset medium ' + fileName + '.mp4', {async: true});
			  	}
			  	process.stdin.setRawMode(false);
			});
		});
	});
}

function endHijack(gameName, twitchStream, cProcess, fileName) {
	const rl = readline.createInterface({  
		input: process.stdin,
		output: process.stdout,
		terminal: false
	});

	return new Promise(function(resolve, reject) {
		process.stdin.setRawMode(false);

		// Delay killing the process for 5 seconds for possible behind the live stream lag.
		return setTimeout(function() {
			// Kill the process now instead of before the delay to give it 5 seconds leeway
			cProcess.kill();

			// Delay for 5 seconds since the twitch stream download will probably be lagging behind
			return setTimeout(function() {
				return saveVideo(fileName)
				.then(function(stored) {

					if (stored) {
						cLogger.mark("\n\nGive a title and description for this video.");
						return rl.question('Enter the title of the video (the date will automatically be added to the end): ', (vodTitle) => {
							rl.close();

							return endHijackHelper(gameName, twitchStream, cProcess, fileName, vodTitle)
							.then(function() {
								return resolve(stored);
							})
							.catch(function(err) {
								return reject(err);
							});
						});
					} else {
						return resolve(stored);
					}
				})
				.catch(function(err) {
					return reject(err);
				});
			}, 5000);

		}, 5000);
	});
}

function saveVideo(fileName) {
	const rl = readline.createInterface({  
		input: process.stdin,
		output: process.stdout,
		terminal: false
	});

	return new Promise(function(resolve, reject) {
		cLogger.mark("\nDo you want to use this video? (No/n to abandon it, anything else to keep it) ");
		return rl.question("", (storeIt) => {

			if (storeIt.toLowerCase() == "no" || storeIt.toLowerCase() == "n") {
				cLogger.info("You have chosen to abandon this file. Deleting it.");
				return deleteFile(fileName)
				.then(function() {
					return resolve(false);
				})
				.catch(function(err) {
					return reject(err);
				});
			} else {
				cLogger.info("You have chosen to use this file. Continuing.");
				return resolve(true);
			}
		});
	});
}

function deleteFile(fileName) {
	return new Promise(function(resolve, reject) {
		var rmCMD = "rm " + fileName + ".mp4";
		cLogger.info("Running command: " + rmCMD);
		return shell.exec(rmCMD, function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			return resolve();
		});
	});
}

function endHijackHelper(gameName, twitchStream, cProcess, fileName, vodTitle) {
	const rl = readline.createInterface({  
		input: process.stdin,
		output: process.stdout,
		terminal: false
	});

	return new Promise(function(resolve, reject) {
		return rl.question('Enter the description of the video (the source will be credited automatically at the bottom): ', (vodDescr) => {
			return shell.exec("echo \"" + getStoredInformation(gameName, twitchStream, vodTitle, vodDescr) + "\" > " + fileName + ".txt", function(code, stdout, stderr) {
				if (code != 0) {
					cLogger.info("Could not save info file. However this is non blocking. Error: ", stderr);
				}

				cLogger.info("\nYou have just completed a hijack, you can find the file in video_data_hijacks/" + gameName + "/" + fileName);
				return resolve();
			});
		});
	});
}

function getStoredInformation(gameName, twitchStream, vodTitle, vodDescr) {
	var currDate = new Date();
	cLogger.mark("\nThe video will have the following properties:");
	cLogger.info("Video Title: " + vodTitle);
	cLogger.info("Video Description: " + vodDescr);
	cLogger.info("Game Name: " + gameName);
	cLogger.info("Twitch Stream Credit: " + twitchStream);
	cLogger.info("Date of Video: " + currDate);

	var b64Game = base64url(gameName);
	var b64Stream = base64url(twitchStream);
	var b64Time = base64url(currDate.getTime() + "");
	var b64Title = base64url(vodTitle);
	var b64Descr = base64url(vodDescr);

	return b64Game + " " + b64Stream + " " + b64Time + " " + b64Title + " " + b64Descr;
}

function buildContent(videosToCombine, gameName) {
	var content = new Map();
	var contentArr = [];
	return new Promise(function(resolve, reject) {
		var count = 0;

		function next() {
			return buildContentComponent(videosToCombine[count], gameName, count)
			.then(function(contentPiece) {
				contentArr.push(contentPiece);
				if (count < (videosToCombine.length - 1)) {
					count++;
					return next();
				} else {
					content.set(gameName, contentArr);
					return resolve(content);
				}
			})
			.catch(function(err) {
				return reject(err);
			});
		}

		next();
	});
}

function buildContentComponent(fileName, gameName, count) {
	return new Promise(function(resolve, reject) {
		var fileNameSplit = fileName.split(".mp4");
		var fileNameNoFType = fileNameSplit[0];

		return fs.readFile(fileNameNoFType + ".txt", function(err, data) {
			if (err) {
				return reject(err);
			}

			var dataB64 = data.toString().split("\n")[0];
			var dataB64Split = dataB64.split(" ");

			var gameN = base64url.decode(dataB64Split[0]);
			if (gameN != gameName) {
				return reject(new Error("Found a different game name in the attributes file."));
			}
			var streamLink = base64url.decode(dataB64Split[1]);
			var contentTime = new Date(parseInt(base64url.decode(dataB64Split[2])));
			var contentTitle = base64url.decode(dataB64Split[3]);
			var contentDesc = base64url.decode(dataB64Split[4]);

			return shell.exec("mv " + fileNameNoFType + ".mp4 clip-" + count + ".mp4", function(code, stdout, stderr) {
				if (code != 0) {
					return reject(stderr);
				}

				return shell.exec("mv " + fileNameNoFType + ".txt clip-" + count + ".txt", function(code, stdout, stderr) {
					if (code != 0) {
						return reject(stderr);
					}

					return resolve({
						clip_channel_name: streamLink.split(".tv/")[1],
						clip_url: streamLink,

						// Some overrides
						hijacked: true,
						override_title: true,
						overrided_title: contentTitle,
						overrided_title_timestamp: contentTime,
						override_description: true,
						overrided_description: contentDesc,
					});
				});
			});
		});
	});
}

function getCurrentStreamGame(streamLink) {
	var streamLinkSplit = streamLink.split(".tv/");
	var streamChannelName = streamLinkSplit[streamLinkSplit.length - 1];
	return new Promise(function(resolve, reject) {
		return twitch.users.usersByName({
			users: [streamChannelName]
		}, (err, res) => {
			if (err) {
				cLogger.error(err);
				return reject(err);
			} else {
				if (res._total != 1 || res.users.length != 1 || res.users[0].type != "user") {
					cLogger.error("Error handling this usersByName response: ", res);
					return reject(new Error("Weirdly this channel is not a user?"));
				} else {
					return twitch.streams.channel({
						channelID: res.users[0]._id,
					}, (err, res) => {
						if (err) {
							cLogger.error(err);
							return reject(err);
						} else {
							if (res.stream == null) {
								cLogger.error("This stream is not currently live! Cannot hijack! Try again with a live stream.");
								return reject(new Error("Stream is not live"));
							} else {
								return resolve(res.stream.game);
							}
						}
					});
				}
			}
		});
	});
}
