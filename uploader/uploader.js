var Promise = require('bluebird');
var shell = require('shelljs');
const {google} = require('googleapis');
var Secrets = require('../config/secrets');
var cLogger = require('color-log');
const fs = require('fs');
const _cliProgress = require('cli-progress');
const _colors = require('colors');
var dbController = require('../controller/db');
const readline = require('readline');
const opn = require('opn');
const base64url = require('base64url');
var Attr = require('../config/attributes');
var dateFormat = require('dateformat');
const VIDEO_DATA_DEFAULT_DIR = "video_data/";
const VIDEO_DATA_HIJACKED_DIR = "video_data_hijacks/";
var VIDEO_DATA_DIRECTORY = VIDEO_DATA_DEFAULT_DIR;

// Constants
const youtubeVideoPrefix = "https://www.youtube.com/watch?v=";

function uploadVideos(content) {
	return new Promise(function(resolve, reject) {

		// Go into the video_data directory
		shell.cd(process.env.YOUTUBE_AUTOMATOR_PATH + VIDEO_DATA_DIRECTORY);

		var uploadedVideos = [];

		return new Promise.mapSeries(content.entries(), function(item, index, len) {
			let gameName = item[0];
			let clips = item[1];

			return new Promise(function(res, rej) {
				// Go into the game directory
				shell.cd(process.env.YOUTUBE_AUTOMATOR_PATH + VIDEO_DATA_DIRECTORY + gameName + "/");

				return _uploadVideo(gameName, clips)
				.then(function(vidID) {
					// Leave the game directory
					shell.cd("..");

					// Check to see if any of the clips have a hijacked tag set
					var isHijacked = false;
					for (var i = 0; i < clips.length; i++) {
						if (clips[i].hijacked) {
							isHijacked = true;
							break;
						}
					}

					// Add the hijacked string to the game name
					var dbGameName = gameName;
					if (isHijacked) {
						dbGameName += " - hijacked";
					}

					cLogger.info("Uploaded video and obtained ID of: " + vidID);
					uploadedVideos.push({
						url: (youtubeVideoPrefix + vidID),
						game: dbGameName,
						created_at: new Date(),
						updated_at: new Date()
					});

					return res();
				})
				.catch(function(err) {

					return addToDB(uploadedVideos)
					.then(function() {
						// Before we terminate make sure to move all of the untracked videos to a new folder
						return recoverAllRemainingVideos(content, gameName, (process.env.YOUTUBE_AUTOMATOR_PATH + "video_data_saved/"))
						.then(function() {
							cLogger.info("Succesfully saved videos + information for backfilling next time.");
							return reject(err);
						})
						.catch(function(err) {
							return reject(err);
						});
					})
					.catch(function(err) {
						cLogger.error("Error adding videos to db: " + err);
						// Before we terminate make sure to move all of the untracked videos to a new folder
						return recoverAllRemainingVideos(content, gameName, (process.env.YOUTUBE_AUTOMATOR_PATH + "video_data_saved/"))
						.then(function() {
							cLogger.info("Succesfully saved videos + information for backfilling next time.");
							return reject(err);
						})
						.catch(function(err) {
							return reject(err);
						});
					});
				});
			});
		})
		.then(function() {
			// Leave the video_data directory
			shell.cd(process.env.YOUTUBE_AUTOMATOR_PATH);

			// Add all of these youtube videos to the db
			return addToDB(uploadedVideos);
		})
		.then(function() {
			// Try to upload any recovered photos
			return uploadRecoveredVideos();
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.uploadRecoveredVideos = function() {
	return new Promise(function(resolve, reject) {
		// Go into the video data saved directory
		shell.cd(process.env.YOUTUBE_AUTOMATOR_PATH + "video_data_saved/");

		return shell.exec("ls", function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			var directories = stdout.split("\n");
			directories.pop(); // Remove the extra empty directory
			return new Promise.mapSeries(directories, function(item, index, len) {
				cLogger.info("Backfill uploading the following directory: " + item);

				return new Promise(function(res, rej) {
					shell.cd(process.env.YOUTUBE_AUTOMATOR_PATH + "video_data_saved/" + item + "/");

					return fs.readFile("overview.txt", function(err, data) {
						if (err) {
							return reject(err);
						}

						var numberOfUploads = data.toString().split("\n")[0];
						cLogger.info("Have to backfill " + numberOfUploads + " video in this folder.");

						return backfillVideos(numberOfUploads)
						.then(function() {

							// Leave this directory
							shell.cd(process.env.YOUTUBE_AUTOMATOR_PATH + "video_data_saved/");
							return shell.exec("rm -R \"" + item + "\"/", function(code, stdout, stderr) {
								return res();
							});
						})
						.catch(function(err) {
							return reject(err);
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
		})
	});
}

function backfillVideos(numberOfUploads) {

	const oauth2Client = new google.auth.OAuth2(
		Secrets.GOOGLE_API_CLIENT_ID,
		Secrets.GOOGLE_API_CLIENT_SECRET,
		Secrets.GOOGLE_API_REDIRECT_URI
	);

	return new Promise(function(resolve, reject) {
		return dbController.getRefreshToken(Secrets.GOOGLE_API_CLIENT_ID)
		.then(function(refreshTkn) {

			if (refreshTkn == null) {
				return reject(new Error("Could not find a refresh token, so cant backfill the videos!"));
			}

			oauth2Client.setCredentials({
				refresh_token: refreshTkn.refresh_token
			});
			google.options({
				auth: oauth2Client
			});

			cLogger.info("The number of uploads in this file is: " + numberOfUploads);
			var count = 0;
			function next() {
				var currFileName = Attr.FINISHED_FNAME + (count + 1);
				cLogger.info("Looking at file " + currFileName + ".[mp4/txt]");
				return handleBackfillFile(currFileName, numberOfUploads, count)
				.then(function() {
					if (count < numberOfUploads - 1) {
						count++;
						next();
					} else {
						return resolve();
					}
				})
				.catch(function(err) {
					return reject(err);
				});
			}

			next();
		})
		.catch(function(err) {
			return reject();
		});
	});
}

function handleBackfillFile(currFileName, numberOfUploads, index) {
	return new Promise(function(resolve, reject) {
		return fs.readFile(currFileName + ".txt", function(err, data) {
			if (err) {
				return reject(err);
			}

			var dataB64 = data.toString().split("\n")[0];
			var dataB64Split = dataB64.split(" ");

			// Get the game name
			var gameName = base64url.decode(dataB64Split[0]);

			// Get the clips data
			var clipsJSON = base64url.decode(dataB64Split[1]);
			var clips = JSON.parse(clipsJSON);
			cLogger.info("Have the following game: " + gameName + " with clip of length: " + clips.length);

			return uploadVideo(gameName, clips, (currFileName + ".mp4"))
			.then(function(vidID) {

				var videoObj = {
					url: (youtubeVideoPrefix + vidID),
					game: gameName,
					created_at: new Date(),
					updated_at: new Date()
				};

				return dbController.addYoutubeVideo(videoObj)
				.then(function() {
					cLogger.info("Have added the video to the DB.");
					return resolve();
				})
				.catch(function(err) {
					return reject(err);
				})
			})
			.catch(function(err) {
				// We need to make sure to delete all already uploaded videos so they don't get uploaded more than once
				return deleteAllUploadedAlready((index + 1), numberOfUploads)
				.then(function() {
					cLogger.info("Youtube uploading failed, however we are succesfully terminating.");
					cLogger.error("This is the Youtube error we received: " + err);
					return reject();
				})
				.catch(function(err2) {
					cLogger.error("Found this error also: ", err);
					return reject(err);
				});
			});
		});
	});
}

function deleteAllUploadedAlready(currNumber, numberOfUploads) {
	return new Promise(function(resolve, reject) {
		let toUpdate = numberOfUploads - (currNumber - 1);

		var toUpdateNames = [];

		return new Promise.mapSeries(new Array(toUpdate), function(item, index, len) {
			let newCurrNumber = currNumber + index;

			return new Promise(function(res, rej) {
				var mvMP4 = "mv " + Attr.FINISHED_FNAME + newCurrNumber + ".mp4 tmp-" + Attr.FINISHED_FNAME + newCurrNumber + ".mp4";
				cLogger.info("Running command: " + mvMP4);
				return shell.exec(mvMP4, function(code, stdout, stderr) {
					if (code != 0) {
						return reject(stderr);
					}

					var mvTXT = "mv " + Attr.FINISHED_FNAME + newCurrNumber + ".txt tmp-" + Attr.FINISHED_FNAME + newCurrNumber + ".txt";
					cLogger.info("Running command: " + mvTXT);
					return shell.exec(mvTXT, function(code, stdout, stderr) {
						if (code != 0) {
							return reject(stderr);
						}

						toUpdateNames.push(newCurrNumber);
						return res();
					})
				})
			});
		})
		.then(function() {
			cLogger.info("Now deleting all already uploaded videos.");
			return new Promise(function(res, rej) {
				var rmCMD = "rm " + Attr.FINISHED_FNAME + "*.mp4 " + Attr.FINISHED_FNAME + "*.txt overview.txt";
				cLogger.info("Running command: " + rmCMD);
				return shell.exec(rmCMD, function(code, stdout, stderr) {

					var count = 1;
					function next() {
						return resetFileName(toUpdateNames[count - 1], count)
						.then(function() {
							if (count < toUpdateNames.length) {
								count++;
								return next();
							} else {
								var echoCMD = "echo \"" + toUpdateNames.length + "\" > overview.txt";
								cLogger.info("Running command: " + echoCMD);
								return shell.exec(echoCMD, function(code, stdout, stderr) {
									if (code != 0) {
										return reject(stderr);
									}

									return resolve();
								});
							}
						})
						.catch(function(err) {
							return reject(err);
						});
					}

					return next();
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

function resetFileName(item, count) {
	return new Promise(function(resolve, reject) {
		var mvCMD = "mv tmp-" + Attr.FINISHED_FNAME + item + ".mp4 " + Attr.FINISHED_FNAME + count + ".mp4";
		cLogger.info("Running command: " + mvCMD);
		return shell.exec(mvCMD, function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}


			var mvCMD2 = "mv tmp-" + Attr.FINISHED_FNAME + item + ".txt " + Attr.FINISHED_FNAME + count + ".txt";
			cLogger.info("Running command: " + mvCMD2);
			return shell.exec(mvCMD2, function(code, stdout, stderr) {
				if (code != 0) {
					return reject(stderr);
				}

				return resolve();
			});
		});
	})
}

module.exports.recoverAllVideos = function(content, startingGame, toSavedDir) {
	return recoverAllRemainingVideos(content, startingGame, toSavedDir);
}

function recoverAllRemainingVideos(content, lastGame, toSavedDir) {
	return new Promise(function(resolve, reject) {
		cLogger.info("Starting to save videos for another time since youtube is probably restricting upload.");

		// Leave the game directory + create a new directory for these videos
		shell.cd(toSavedDir);
		var currDate = new Date();
		var dirName = currDate.toString();
		shell.mkdir(dirName);
		shell.cd(dirName + "/");

		var foundStart = false;
		var count = 1;

		return new Promise.mapSeries(content.entries(), function(item, index, len) {
			let gameName = item[0];
			let clips = item[1];

			return new Promise(function(res, rej) {
				if (!foundStart) {
					if (gameName == lastGame) {
						foundStart = true;
					} else {
						return res(); // Already uploaded this video
					}
				}

				// Save the video
				var cpCmd = "cp \"../../" + VIDEO_DATA_DIRECTORY + "/" + gameName + "/" + Attr.FINISHED_FNAME + ".mp4\" " + Attr.FINISHED_FNAME + count + ".mp4";
				cLogger.info("Running the following command: " + cpCmd);
				return shell.exec(cpCmd, function(code, stdout, stderr) {
					if (code != 0) {
						return reject(stderr);
					}

					var clipsJSON = JSON.stringify(clips);
					var clipsB64 = base64url(clipsJSON);
					var gameNameB64 = base64url(gameName);

					return shell.exec("echo \"" + gameNameB64 + " " + clipsB64 + "\" > " + Attr.FINISHED_FNAME + count + ".txt", function(code, stdout, stderr) {
						if (code != 0) {
							return reject(stderr);
						}

						count++;
						return res();
					});
				});
			});
		})
		.then(function() {
			return shell.exec("echo \"" + (count - 1) + "\" > overview.txt", function(code, stdout, stderr) {
				if (code != 0) {
					return reject(stderr);
				}

				return resolve();
			});
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function addToDB(uploaded) {
	return new Promise(function(resolve, reject) {
		var count = 0;

		function next() {
			return addYTVideo(uploaded[count])
			.then(function() {
				if (count < (uploaded.length - 1)) {
					count++;
					return next();
				} else {
					return resolve();
				}
			})
			.catch(function(err) {
				return reject(err);
			});
		}

		next();
	});
}

function addYTVideo(item) {
	return new Promise(function(resolve, reject) {
		return dbController.addYoutubeVideo(item)
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// Get access token
function getAccessToken(content) {
    return new Promise(function(resolve, reject) {
    	cLogger.info("Looking for refresh tokens.");
    	return dbController.getRefreshToken(Secrets.GOOGLE_API_CLIENT_ID)
    	.then(function(obj) {
			const oauth2Client = new google.auth.OAuth2(
				Secrets.GOOGLE_API_CLIENT_ID,
				Secrets.GOOGLE_API_CLIENT_SECRET,
				Secrets.GOOGLE_API_REDIRECT_URI
			);

    		if (obj == null) { // We dont have any saved refresh tokens, so ask for them
    			cLogger.info("ATTENTION WE NEED YOU TO AUTHENTICATE TO UPLOAD YOUR YOUTUBE VIDEO!");

				const scopes = [
					"https://www.googleapis.com/auth/youtube"
				]

				var contentStringified = JSON.stringify([...content]);
				var encodedContent = base64url(contentStringified);

				const url = oauth2Client.generateAuthUrl({
					access_type: 'offline',
					scope: scopes,
					state: encodedContent
				});

				opn(url);
				return resolve();
    		}

    		cLogger.info("Have saved refresh tokens.");
    		oauth2Client.setCredentials({
    			refresh_token: obj.refresh_token
    		});
    		google.options({
    			auth: oauth2Client
    		});

    		return uploadVideos(content)
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
    });
}

module.exports.startUploadingWithToken = function(code, contentSTR) {
	return new Promise(function(resolve, reject) {
		var contentJSONStr = base64url.decode(contentSTR);
		var content = new Map(JSON.parse(contentJSONStr));

		const oauth2Client = new google.auth.OAuth2(
			Secrets.GOOGLE_API_CLIENT_ID,
			Secrets.GOOGLE_API_CLIENT_SECRET,
			Secrets.GOOGLE_API_REDIRECT_URI
		);

		// First thing we need to do is get an access and refresh token
		oauth2Client.getToken(code);
		oauth2Client.on('tokens', (tokens) => {
			oauth2Client.setCredentials(tokens);
			google.options({
    			auth: oauth2Client
    		});

			if (!tokens.refresh_token) {
				cLogger.warn("Could not find a refresh token! This means each time we need to upload we need user interaction.");
				return uploadVideos(content)
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(err);
				});
			} else {
				return dbController.addRefreshToken(Secrets.GOOGLE_API_CLIENT_ID, tokens.refresh_token, tokens.access_token)
				.then(function() {
					cLogger.info("Added the refresh & access token to the DB for future use.");

					return uploadVideos(content)
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
		});
	});
}

module.exports.startUploadProcess = function(content) {
	VIDEO_DATA_DIRECTORY = VIDEO_DATA_DEFAULT_DIR;
	return initUpload(content);
}

module.exports.uploadHijackedVideos = function(content) {
	VIDEO_DATA_DIRECTORY = VIDEO_DATA_HIJACKED_DIR;
	return initUpload(content);
}

function initUpload(content) {
	return new Promise(function(resolve) {
		return getAccessToken(content)
		.then(function(result) {
			return resolve();
		})
		.catch(function(err) {
			return resolve();
		});
	});
}

function _uploadVideo(gameName, clips) {
	return uploadVideo(gameName, clips, (Attr.FINISHED_FNAME + ".mp4"));
}

// Uploads the video that is in the current directory, named 'finished.mkv'
function uploadVideo(gameName, clips, fileName) {
	return new Promise(function(resolve, reject) {
		const youtube = google.youtube({ version:'v3'});
		var fileSize = fs.statSync(fileName).size;

		// Start the progress bar
		cLogger.info("Starting upload for " + gameName);
		const bar1 = new _cliProgress.Bar({
			format: _colors.green('Progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | Elapsed: {duration_formatted}'),
			barsize: 80,
			fps: 20,
			etaBuffer: 15
		});
		bar1.start(fileSize, 0);

		return dbController.episodeCount(gameName)
		.then(function(episodeNumber) {
			return dbController.getPlaylist(gameName)
			.then(function(playlistID) {

				var vodTitle = getTitle(gameName, clips, episodeNumber);
				var vodDescription = getDescription(gameName, clips);
				var snippetObj = {
					title: vodTitle,
					description: vodDescription,
					tags: getKeywords(gameName, clips),
					categoryId: "22", // Gaming
					defaultLanguage: "en"
				};

				return youtube.videos.insert({
					part: "id,snippet,status",
					notifySubscribers: true,
					requestBody: {
						snippet: snippetObj,
						status: {
							privacyStatus: 'public',
						},
					},
					media: {
						body: fs.createReadStream(fileName),
					},
				}, {
			    	onUploadProgress: evt => {
			    		const progress = evt.bytesRead;
						bar1.update(Math.round(progress));
			    	},
				})
				.then(function(res) {
					bar1.stop();

					let data = res.data;
					let videoID = data.id;

					// Now try to add the playlist if it exists
					return addToYoutubePlaylist(youtube, videoID, playlistID)
					.then(function() {

						// Now try to add the thumbnail if it exists
						return attemptToAddThumbnail(youtube, videoID, clips, gameName)
						.then(function() {
							return resolve(videoID);
						})
						.catch(function(err) {
							cLogger.info("Have encountered an error adding a thumbnail, however not terminating since its not worth.");
							cLogger.error("The ignored error was: ", err);
							return resolve(videoID);
						});
					})
					.catch(function(err) {
						cLogger.info("Have encountered an error adding to playlist, however not terminating since its not worth.");
						cLogger.error("The ignored error was: ", err);
						return resolve(videoID);
					});
				})
				.catch(function(err) {
					bar1.stop();
					return reject(err);
				});
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

module.exports.changeThumbnail = function(videoID, clips, gameName) {
	const oauth2Client = new google.auth.OAuth2(
		Secrets.GOOGLE_API_CLIENT_ID,
		Secrets.GOOGLE_API_CLIENT_SECRET,
		Secrets.GOOGLE_API_REDIRECT_URI
	);

	return new Promise(function(resolve, reject) {
		return getRefreshToken(Secrets.GOOGLE_API_CLIENT_ID)
		.then(function(tokens) {
			if (tokens == null) {
				return reject(new Error("Could not find a refresh token."));
			}

			oauth2Client.setCredentials({
				refresh_token: tokens.refresh_token
			});
			google.options({
				auth: oauth2Client
			});
			const youtube = google.youtube({ version:'v3'});
			shell.cd(process.env.YOUTUBE_AUTOMATOR_PATH + "video_data_hijacks/Fortnite/");
			return attemptToAddThumbnail(youtube, videoID, clips, gameName)
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
	});
}

function attemptToAddThumbnail(youtube, videoID, clips, gameName) {
	return new Promise(function(resolve, reject) {
		var hijacked = false;
		var hijackedName = null;

		if (clips.length > 0 && clips[0].hijacked) {
			hijacked = true;
			hijackedName = clips[0].clip_channel_name;
			cLogger.info("Looking for a hijacked thumbnail for channel: " + hijackedName);
		} else {
			cLogger.info("Looking for a game thumbnail for game: " + gameName);
		}

		return dbController.getThumbnail(gameName, hijacked, hijackedName)
		.then(function(thumbnail) {
			if (thumbnail == null) {
				cLogger.info("No thumbnail found. Countinuing.");
				return resolve();
			} else {
				shell.cd(process.env.YOUTUBE_AUTOMATOR_PATH + "thumbnails/"); // Leave the game directory and into the thumbnails directory
				return youtube.thumbnails.set({
					videoId: videoID,
					media: {
						mimeType: "image/jpeg",
						body: fs.createReadStream(thumbnail)
					},
				},
				(err, thumbResponse) => {
					if (err) {
						return reject(err);
					}

					cLogger.info("Thumbnail succesfully added!");
					return resolve();
				})
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function addToYoutubePlaylist(youtube, videoID, playlistID) {
	return new Promise(function(resolve, reject) {
		if (playlistID == null) return resolve();

		var req = {
			playlistId: playlistID,
			part: "snippet",
			resource: {
				snippet: {
					playlistId: playlistID,
					resourceId: {
						kind: "youtube#video",
						videoId: videoID
					},
				},
			},
		};

		return youtube.playlistItems.insert(req)
		.then(function(results) {
			cLogger.info("Succesfully added video to playlist.");
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// Builds a title for the video
function getTitle(gameName, clips, episodeNumber) {
	if (clips.length > 0 && clips[0].override_title) {
		var niceDate = dateFormat(clips[0].overrided_title_timestamp, "mediumDate");
		if (clips.length == 1) { // Only one video
			return (gameName + " " + clips[0].overrided_title + " - " + niceDate);
		} else {
			return (gameName + " " + clips[0].overrided_title + " (And More!) - " + niceDate);
		}
	} else {
		return (gameName + " " + Attr.VIDEO_TITLE + (parseInt(episodeNumber) + 1));
	}
}

// Builds a description of a video. Includes the credits to the twitch clips
function getDescription(game, clips) {

	var descr = "";
	var creditsPortion = "\n\n.\n.\n.\n.\n.\n.\nCredits:\n";

	// Check to see if there are overrides
	if (clips.length > 0 && clips[0].override_description) {
		if (clips.length == 1) { // A single clip only
			descr = clips[0].overrided_description;
		} else {
			for (var i = 0; i < clips.length; i++) {
				descr += "Clip " + (i + 1) + ":\n";
				if (clips[i].override_description) {
					descr += "Title: " + clips[i].overrided_title + "\n";
					descr += "Description: " + clips[i].overrided_description + "\n";
				}
			}
		}
		descr += creditsPortion;
	} else {
		descr = Attr.VIDEO_DESCR + creditsPortion;
	}
	for (var i = 0; i < clips.length; i++) {
		descr += clips[i].clip_channel_name + ": " + clips[i].clip_url + "\n";
	}		
	return descr;
}

// Builds out some keywords, including anyone in the video
function getKeywords(game, clips) {
	var tagsMap = Attr.DEFAULT_TAGS_MAP;
	var gameTags = tagsMap.get(game);
	if (gameTags == undefined) {
		gameTags = [];
	}
	var tags = gameTags;
	tags.push(game);
	tags.push((game + " pros"));
	for (var i = 0; i < clips.length; i++) {
		if (tags.indexOf(clips[i].clip_channel_name) == -1) {
			tags.push(clips[i].clip_channel_name);
		}
	}
	return tags;
}