var Promise = require('bluebird');
var cLogger = require('color-log');
const readline = require('readline');
var shell = require('shelljs');
var Attr = require('../config/attributes');
const base64url = require('base64url');

module.exports.startHijacking = function() {
	return new Promise(function(resolve, reject) {
		const rl = readline.createInterface({
		  input: process.stdin,
		  output: process.stdout
		});

		// Go into the video_data_hijacks directory
		shell.cd("video_data_hijacks/");

		return rl.question('Enter the Twitch TV stream you want to hijack (ex. \"https://www.twitch.tv/tfue\"): ', (twitchStream) => {
			cLogger.info("The user entered: " + twitchStream);
			rl.close();

			function next() {
				return getCurrentStreamGame(twitchStream)
				.then(function(game) {
					cLogger.info("This stream is currently playing the following game: " + game);
					return processHijack(game, twitchStream)
					.then(function() {
						return attemptUpload();
					})
					.then(function() {
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

function attemptUpload() {
	return new Promise(function(resolve, reject) {
		return setTimeout(function() {
			cLogger.info("\n\nDone processing. Attempting to do an upload now.");
			var lsCMD = ("ls");
			cLogger.info("Running command: " + lsCMD);
			return shell.exec(lsCMD, function(code, stdout, stderr) {
				if (code != 0) {
					return reject(stderr);
				}

				var files = stdout.split("\n");
				files.pop(); // Remove empty file
				var count = 0;

				// TODO: See if we can upload a video. Either by combining videos or by uploading a single video.
			});
		}, 5000);
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

			shell.cd(gameName + "/");

			// Ask to initiate the hijack
			cLogger.mark("\nPress any key to start hijacking.\n");
			process.stdin.setRawMode(true);
			process.stdin.resume();

			var hijacking = false;
			var cProcess = null;
			var fileName = null;

			return process.stdin.on('data', function(data) {
			  	if (hijacking) {
			  		cLogger.info("Ending the hijack!");
			  		hijacking = false;

			  		if (cProcess != null) {
			  			return shell.exec("echo \"" + base64url(gameName) + " " + base64url(twitchStream) + " " + base64url((new Date).getTime() + "") + "\" > " + fileName + ".txt", function(code, stdout, stderr) {
			  				if (code != 0) {
			  					cLogger.info("Could not save info file. However this is non blocking. Error: ", stderr);
			  				}

				  			cProcess.kill();
				  			cLogger.info("\nYou have just completed a hijack, you can find the file in video_data_hijacks/" + gameName + "/" + fileName);
				  			return resolve();
			  			});
			  		}
			  	} else {
					cLogger.info("Starting the hijack! You will see some text appear shortly. Press Enter again to stop the hijack.");
			  		hijacking = true;

			  		var epoch = (new Date).getTime();
			  		fileName = "finished-" + epoch;

			  		cProcess = shell.exec('ffmpeg -i $(youtube-dl -f best -g ' + twitchStream + ') -codec:v libx264 -crf 21 -bf 2 -flags +cgop -pix_fmt yuv420p -codec:a aac -strict -2 -b:a 384k -r:a 48000 -movflags faststart ' + fileName + '.mp4', {async: true});
			  	}
			  	process.stdin.setRawMode(false);
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
