var Promise = require('bluebird');
var shell = require('shelljs');
const {google} = require('googleapis');
var Secrets = require('../config/secrets');
var cLogger = require('color-log');
const fs = require('fs');
const _cliProgress = require('cli-progress');
const _colors = require('colors');
var dbController = require('../controller/db');
var Commenter = require('../commenter/commenter');
var Rater = require('../rater/rater');
var OAuthFlow = require('../oauth/oauth_flow');
const readline = require('readline');
const opn = require('opn');
const base64url = require('base64url');
var Attr = require('../config/attributes');
var dateFormat = require('dateformat');
const VIDEO_DATA_DEFAULT_DIR = "video_data/";
const VIDEO_DATA_HIJACKED_DIR = "video_data_hijacks/";
var ErrorHelper = require('../errors/errors');
var VIDEO_DATA_DIRECTORY = VIDEO_DATA_DEFAULT_DIR;

// Constants
const youtubeVideoPrefix = "https://www.youtube.com/watch?v=";

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// uploadRecoveredVideos
// Looks into the video_data_saved/ file for recovered videos (when youtube hits the quota cap.) and starts to upload them in order.
module.exports.uploadRecoveredVideos = function() {
	return new Promise(function(resolve, reject) {
		// Go into the video data saved directory
		shell.cd(ORIGIN_PATH + "video_data_saved/");

		return shell.exec("ls", function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			var directories = stdout.split("\n");
			directories.pop(); // Remove the extra empty directory
			return new Promise.mapSeries(directories, function(item, index, len) {
				cLogger.info("Backfill uploading the following directory: " + item);

				return new Promise(function(res, rej) {
					shell.cd(ORIGIN_PATH + "video_data_saved/" + item + "/");

					return fs.readFile("overview.txt", function(err, data) {
						if (err) {
							return reject(err);
						}

						var numberOfUploads = data.toString().split("\n")[0];
						cLogger.info("Have to backfill " + numberOfUploads + " video in this folder.");

						return backfillVideos(numberOfUploads)
						.then(function() {

							// Leave this directory
							shell.cd(ORIGIN_PATH + "video_data_saved/");
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

// recoverAllVideos
// When youtube rejects a video for whatever reason (usually hitting the quota cap) we need to make sure to recover all of the remaining
// content. However at the same time not recovering the content that has succesfully been uploaded (if any has been.)
// This function will recover all of the videos starting at an initial game.
module.exports.recoverAllVideos = function(content, startingGame, toSavedDir) {
	return recoverAllRemainingVideos(content, startingGame, toSavedDir);
}

// recoverAllVideosWrapper
// The same as above however recovers all of the content (ie. startingGame is the first element)
module.exports.recoverAllVideosWrapper = function(content, toSavedDir) {
	var firstEntry = content.entries().next().value;
	var startingGame = "";
	if (firstEntry != undefined && firstEntry.length > 0) {
		startingGame = firstEntry[0];
	}

	return recoverAllRemainingVideos(content, startingGame, toSavedDir);
}

// startUploadingWithToken
// Starts uploading content in Base64 format. This function is called immediately after an OAuth2 accept callback.
// The code is used to get the refresh token.
module.exports.startUploadingWithToken = function(code, contentSTR) {
	return new Promise(function(resolve, reject) {
		var contentJSONStr = base64url.decode(contentSTR);
		var content = new Map(JSON.parse(contentJSONStr));

		return OAuthFlow.initCallback(code)
		.then(function() {
			return uploadVideos(content);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// startUploadProcess
// Start the upload process, using a source directory of 'video_data'
module.exports.startUploadProcess = function(content) {
	VIDEO_DATA_DIRECTORY = VIDEO_DATA_DEFAULT_DIR;
	return initUpload(content);
}

// uploadHijackedVideos
// Start the upload process, using a source directory of 'video_data_hijacks'
module.exports.uploadHijackedVideos = function(content) {
	VIDEO_DATA_DIRECTORY = VIDEO_DATA_HIJACKED_DIR;
	return initUpload(content);
}

// changeThumbnail
// Gets a refresh token, then 
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
				return reject(new Error("Could not find a refresh token. Please re-auth first."));
			}

			oauth2Client.setCredentials({
				refresh_token: tokens.refresh_token
			});
			google.options({
				auth: oauth2Client
			});
			const youtube = google.youtube({ version:'v3'});
			shell.cd(ORIGIN_PATH + "video_data_hijacks/Fortnite/");

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

// --------------------------------------------
// Exported compartmentalized functions above.
// --------------------------------------------
// Helper functions below.
// --------------------------------------------

function uploadVideos(content) {
	return new Promise(function(resolve, reject) {

		// Go into the video_data directory
		shell.cd(ORIGIN_PATH + VIDEO_DATA_DIRECTORY);

		var uploadedVideos = [];

		return new Promise.mapSeries(content.entries(), function(item, index, len) {
			let gameName = item[0];
			let clips = item[1];

			return new Promise(function(res, rej) {
				// Go into the game directory
				shell.cd(ORIGIN_PATH + VIDEO_DATA_DIRECTORY + gameName + "/");

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
						user_id: "LOCAL",
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
						return recoverAllRemainingVideos(content, gameName, (ORIGIN_PATH + "video_data_saved/"))
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
						return recoverAllRemainingVideos(content, gameName, (ORIGIN_PATH + "video_data_saved/"))
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
			shell.cd(ORIGIN_PATH);

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
					user_id: "LOCAL",
					url: (youtubeVideoPrefix + vidID),
					game: gameName,
					created_at: new Date(),
					updated_at: new Date()
				};

				return dbController.addYoutubeVideo(videoObj, "") // DEPRECATED THIS WILL NO LONGER WORK
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

function recoverAllRemainingVideos(content, lastGame, toSavedDir) {
	return new Promise(function(resolve, reject) {
		cLogger.info("Starting to save videos for another time since youtube is probably restricting upload.");

		// Leave the game directory + create a new directory for these videos
		shell.cd(toSavedDir);
		var currDate = new Date();
		var dirName = currDate.getTime().toString();
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
		return dbController.addYoutubeVideo(item, "") // DEPRECATED THIS WILL NOT WORK.
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function initUpload(content) {
	return new Promise(function(resolve) {
		return OAuthFlow.getAccessToken(content)
		.then(function(canContinue) {
			if (!canContinue) {
				cLogger.info("Getting authorization from the user. This process is gonna pop off the stack.");
				return resolve();
			}
			return uploadVideos(content);
		})
		.then(function() {
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

function _createYoutubeClientForUser(accessTkn, refreshTkn) {
	
	// Generate the Auth Client
	var redirectLink = Secrets.GOOGLE_API_REDIRECT_URI2; // Development
	if (Attr.SERVER_ENVIRONMENT == "production") {
		redirectLink = process.env.AUTOTUBER_GOOGLE_API_REDIRECT_URI;
		if (redirectLink == undefined) {
			redirectLink = Secrets.GOOGLE_API_REDIRECT_URI3;
		}
	}

	// Try to get this info from the environment variables first (for batch jobs) then default to secrets file.
	var googleApiCLientID = process.env.AUTOTUBER_GOOGLE_API_CLIENT_ID;
	if (googleApiCLientID == undefined) {
		googleApiCLientID = Secrets.GOOGLE_API_CLIENT_ID;
	}
	var googleApiClientSecret = process.env.AUTOTUBER_GOOGLE_API_CLIENT_SECRET;
	if (googleApiClientSecret == undefined) {
		googleApiClientSecret = Secrets.GOOGLE_API_CLIENT_SECRET;
	}

	const oauth2Client = new google.auth.OAuth2(
		googleApiCLientID,
		googleApiClientSecret,
		redirectLink
	);

	// Add the stored OAuth Credentials to the auth client
    oauth2Client.setCredentials({
		refresh_token: refreshTkn
	});

	// Set the google auth client to be this new auth client.
	google.options({
		auth: oauth2Client
	});

	// Create a youtube API object for this user
	var youtubeClient = google.youtube({ version:'v3'});

	return youtubeClient;
}

module.exports.createYoutubeClientForUserWrapper = function(accessTkn, refreshTkn) {
	return _createYoutubeClientForUser(accessTkn, refreshTkn);
}

function _uploadToYoutubeHelper(videoObject, privacyVal, fileName, accessTkn, refreshTkn, fileSize) {
	return new Promise(function(resolve, reject) {

		// Create the google api client for this user
		var youtubeClient = _createYoutubeClientForUser(accessTkn, refreshTkn);

		var previousLog = new Date();
		function progressLogger(progress) {
			var secondsPassed = Math.floor(((new Date()).getTime() - previousLog.getTime()) / 1000);
			if (secondsPassed > 10) {
	    		var percentProgress = Math.round((progress / fileSize) * 100);
	    		cLogger.mark("Upload Progress (" + percentProgress + "%)");
	    		previousLog = new Date();
			}
		}

		cLogger.info("Starting to upload video.");
		return youtubeClient.videos.insert({
			part: "id,snippet,status",
			notifySubscribers: true,
			requestBody: {
				snippet: videoObject,
				status: {
					privacyStatus: privacyVal,
				},
			},
			media: {
				body: fs.createReadStream(fileName),
			},
		}, {
	    	onUploadProgress: evt => {
	    		const progress = evt.bytesRead;
	    		progressLogger(progress);
	    	},
		})
		.then(function(res) {
			let data = res.data;
			let videoID = data.id;
			let channelID = data.snippet.channelId;

			return resolve([videoID, channelID, youtubeClient]);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _checkIfFileExists(fileLocation) {
	return new Promise(function(resolve, reject) {
		return fs.access(fileLocation, error => {
			if (!error) {
				return resolve(true);
			} else {
				return resolve(false);
			}
		});
	});
}

function _checkIfNeededVidInfo(vidInfo) {
	return new Promise(function(resolve, reject) {
		if (vidInfo.description == null) {
			return resolve("description");
		} else if (vidInfo.title == null) {
			return resolve("title");
		} else if (!vidInfo.youtube_settings.category || vidInfo.youtube_settings.category == null || vidInfo.youtube_settings.category == "") {
			return resolve("category");
		} else if (!vidInfo.youtube_settings.vid_language || vidInfo.youtube_settings.vid_language == null || vidInfo.youtube_settings.vid_language == "") {
			return resolve("video_language");
		} else {
			return resolve(undefined);
		}
	})
}

module.exports.validateVideoCanBeUploaded = function(userID, pmsID, downloadID, folderLocation, vidInfo) {
	return new Promise(function(resolve, reject) {
		// TODO: Validate that the user has room to upload

		function logErrorWrapper(missingItm) {
			var tmpErr = "Can't upload video since it is missing: " + missingItm;
			cLogger.error(tmpErr);
			ErrorHelper.scopeConfigureWarning("uploader.validateVideoCanBeUploaded", {
				user_id: userID,
				pms_id: pmsID,
				download_id: downloadID,
				folder_loc: folderLocation,
				vid_info: vidInfo
			});
			ErrorHelper.emitSimpleError(new Error(tmpErr));
			return resolve(false);
		}

		return _checkIfFileExists(folderLocation + "finished.mp4")
		.then(function(fileExists) {
			if (!fileExists) {
				return logErrorWrapper("processed_video");
			} else {
				return _checkIfNeededVidInfo(vidInfo);
			}
		})
		.then(function(anyMissingOptions) {
			if (anyMissingOptions != undefined) {
				return logErrorWrapper(anyMissingOptions);
			} else {
				return _userHasVideosLeft(pmsID);
			}
		})
		.then(function(hasVideosLeft) {
			if (!hasVideosLeft) {
				return logErrorWrapper("videos_left_to_upload");
			} else {
				return resolve(true);
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _userHasVideosLeft(pmsID) {
	return new Promise(function(resolve, reject) {
		return dbController.getActiveSubscriptionWrapper(pmsID)
		.then(function(subscriptionInfo) {
            let activeSubscriptionID = subscriptionInfo[0];
            let numberOfVideosLeft = subscriptionInfo[1];
            let userBanned = subscriptionInfo[2];
            let userBannedReason = subscriptionInfo[3];

            if (numberOfVideosLeft > 0 && userBanned == false) {
            	return resolve(true);
            } else {
            	return resolve(false);
            }
		})
		.catch(function(err) {
			return reject(err);
		})
	});
}

module.exports.uploadUsersVideo = function(userID, pmsID, downloadID, folderLocation, vidInfo) {
	return new Promise(function(resolve, reject) {
		// The absolute location of the file
		var fileName = folderLocation + "finished.mp4";

		var fileSize = fs.statSync(fileName).size;

		// Some values that we will need throughout the lifecycle of this function
		var videoID = null;
		var channelID = null;
		var usersAccessTkn = null;
		var usersRefreshTkn = null;
		var youtubeClient = null;
		var savedThumbnail = null;

		// Start the progress bar
		cLogger.info("Starting upload for " + userID + " the highest clip downloadID is: " + downloadID);

		// Extract some of the youtube settings
		var categoryVal = vidInfo.youtube_settings.category;
		if (vidInfo.youtube_settings.custom_category != null) {
			categoryVal = vidInfo.youtube_settings.custom_category;
		}
		var languageVal = vidInfo.youtube_settings.vid_language;
		if (vidInfo.youtube_settings.custom_language != null) {
			languageVal = vidInfo.youtube_settings.custom_language;
		}
		var descriptionVal = vidInfo.description;
		if (vidInfo.youtube_settings.signature != null) {
			descriptionVal += "\n\n" + vidInfo.youtube_settings.signature;
		}
		var privacyVal = "public";
		if (vidInfo.youtube_settings.custom_privacy != null) {
			privacyVal = vidInfo.youtube_settings.custom_privacy;
		}

		// Build the video object
		var videoObject = {
			title: vidInfo.title,
			description: descriptionVal,
			tags: vidInfo.youtube_settings.tags,
			categoryId: categoryVal,
			defaultLanguage: languageVal
		};

		return dbController.getActiveSubscriptionWrapper(pmsID)
		.then(function(subscriptionInfo) {
			let activeSubscriptionID = subscriptionInfo[0];
			let numberOfVideosLeft = subscriptionInfo[1];
			let userBanned = subscriptionInfo[2];
			let userBannedReason = subscriptionInfo[3];

			// If the user has a basic subscription then add some autotuber free advertising to the description + the tags.
			if (activeSubscriptionID == "667" || activeSubscriptionID == "-1" || activeSubscriptionID == -1) {
				videoObject.description = videoObject.description + "\n\nProduced using the AutoTuber web application (twitchautomator.com). Jump start your Twitch streamer career by automatically uploading Youtube videos!";
				videoObject.tags.push("autotuber");
				videoObject.tags.push("AutoTuber");
				videoObject.tags.push("twitchautomator.com");
				videoObject.tags.push("twitchautomator.com/how-it-works");
			}

			// This should never happen. Sanity check.
			if (numberOfVideosLeft <= 0) {
				return reject(new Error("The number of videos left for the user is less than or equal to 0."));
			} else if (userBanned) {
				return reject(new Error("The user is banned, shouldn't be uploading."));
			}

			// Get the users OAuth2 Tokens
			var googleAPIClientID = process.env.AUTOTUBER_GOOGLE_API_CLIENT_ID;
			if (googleAPIClientID == undefined) {
				googleAPIClientID = Secrets.GOOGLE_API_CLIENT_ID;
			}

			return dbController.getUsersTokens(userID, googleAPIClientID);
		})
		.then(function(userTokens) {
			if (userTokens == null) {
				return reject(new Error("Could not find the users access + refresh tokens."));
			}

			usersAccessTkn = userTokens.access_token;
			usersRefreshTkn = userTokens.refresh_token;

			// Start uploading to Youtube
			return _uploadToYoutubeHelper(videoObject, privacyVal, fileName, usersAccessTkn, usersRefreshTkn, fileSize);
		})
		.then(function(postedVidInfo) {
			videoID = postedVidInfo[0];
			channelID = postedVidInfo[1];
			youtubeClient = postedVidInfo[2];

			return _addExtraPostVideoSettings(youtubeClient, videoID, channelID, vidInfo, folderLocation, pmsID);
		})
		.then(function(addedThumbnail) {
			savedThumbnail = addedThumbnail;
			return _deleteProcessedVideoFolder(folderLocation);
		})
		.then(function() {
			return resolve(["https://www.youtube.com/watch?v=" + videoID, savedThumbnail]);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _deleteProcessedVideoFolder(folderLocation) {
	return new Promise(function(resolve, reject) {
		var cmd = "rm -rf " + folderLocation;
		cLogger.info("Running CMD: " + cmd);
		return shell.exec(cmd, function(code, stdout, stderr) {
			if (code != 0) {
				cLogger.info("Unable to delete the processed video folder. Needs to be manually deleted.");
				ErrorHelper.scopeConfigureWarning("uploader._deleteProcessedVideoFolder", {
					folder_location: folderLocation,
					err: stderr
				});
				ErrorHelper.emitSimpleError(err);
			}

			return resolve();
		});
	});
}

function _attemptToAddToPlaylist(youtubeClient, videoID, playlistID) {
	return new Promise(function(resolve, reject) {
		// Now try to add the playlist if it exists
		return addToYoutubePlaylist(youtubeClient, videoID, playlistID)
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			cLogger.info("Have encountered an error adding a playlist, however not terminating since its not worth.");
			ErrorHelper.scopeConfigureWarning("uploader._attemptToAddToPlaylist", {
				video_id: videoID,
				playlist_id: playlistID
			});
			ErrorHelper.emitSimpleError(err);
			return resolve();
		});
	});
}

function _downloadThumbnailToLocal(thumbnailImg, folderPath) {
	return new Promise(function(resolve, reject) {

		// Get the actual file name that is stored in S3
		var fileNameSplit = thumbnailImg.split(Attr.CDN_URL);
		var fileNameActual = fileNameSplit[fileNameSplit.length - 1];
		fileNameActual = fileNameActual.substr(1); // Remove the leading '/'

		// Get the image file type
		var imageFileTypeSplit = fileNameActual.split(".");
		var imageFileType = imageFileTypeSplit[imageFileTypeSplit.length - 1];

		// Create the destination path
		var destinationPath = folderPath + "thumbnail_to_set." + imageFileType;

		var cmd = "aws s3 cp s3://" + Attr.AWS_S3_BUCKET_NAME + fileNameActual + " " + destinationPath;
		cLogger.info("Running CMD: " + cmd);
		return shell.exec(cmd, function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			return resolve(destinationPath);
		});
	});
}

function _deleteDownloadedThumbnailHelper(imageLocation) {
	return new Promise(function(resolve, reject) {
		var cmd = "rm " + imageLocation;
		cLogger.info("Running CMD: " + cmd);
		return shell.exec(cmd, function(code, stdout, stderr) {
			if (code != 0) {
				ErrorHelper.scopeConfigureWarning("uploader._deleteDownloadedThumbnailHelper", {
					image_location: imageLocation
				});
				ErrorHelper.emitSimpleError(stderr);
			}

			return resolve();
		});
	});
}

function _setThumbnailHelper(youtubeClient, videoID, thumbnailImgPath) {
	return new Promise(function(resolve, reject) {
		return youtubeClient.thumbnails.set({
			videoId: videoID,
			media: {
				mimeType: "image/jpeg",
				body: fs.createReadStream(thumbnailImgPath)
			},
		},
		(err, thumbResponse) => {
			if (err) {
				return reject(err);
			} else {
				cLogger.info("Thumbnail succesfully added!");
				return resolve();
			}
		});
	});
}

function _attemptToAddVidThumbnail(youtubeClient, videoID, thumbnailImg, folderPath) {
	return new Promise(function(resolve, reject) {
		var downloadedThumbnailLocation = null;

		// No thumbnail to add.
		if (thumbnailImg == null) {
			return resolve(null);
		}

		return _downloadThumbnailToLocal(thumbnailImg, folderPath)
		.then(function(destinationPath) {
			downloadedThumbnailLocation = destinationPath;
			return _setThumbnailHelper(youtubeClient, videoID, destinationPath);
		})
		.then(function() {
			return _deleteDownloadedThumbnailHelper(downloadedThumbnailLocation);
		})
		.then(function() {
			return resolve(thumbnailImg);
		})
		.catch(function(err) {
			cLogger.info("Have encountered an error adding a thumbnail, however not terminating since its not worth.");
			ErrorHelper.scopeConfigureWarning("uploader._attemptToAddVidThumbnail", {
				video_id: videoID,
				thumbnail_img: thumbnailImg,
				folder_path: folderPath
			});
			ErrorHelper.emitSimpleError(err);
			return resolve(null);
		});
	});
}

function _attemptToAddComment(youtubeClient, videoID, channelID, gameName, pmsID) {
	return new Promise(function(resolve, reject) {
		return Commenter.addUsersDefaultComment(youtubeClient, videoID, channelID, gameName, pmsID)
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			cLogger.info("Have encountered an error adding a comment, however not terminating since its not worth.");
			ErrorHelper.scopeConfigureWarning("uploader._attemptToAddComment", {
				video_id: videoID,
				channel_id: channelID,
				game_name: gameName
			});
			ErrorHelper.emitSimpleError(err);
			return resolve();
		});
	});
} 

function _attemptToLikeVideo(youtubeClient, videoID, vidInfo) {
	return new Promise(function(resolve, reject) {
		if (vidInfo.youtube_settings.liked == "true" || vidInfo.youtube_settings.liked == true) {
			return Rater.likeVideo(youtubeClient, videoID)
			.then(function() {
				return resolve();
			})
			.catch(function(err) {
				cLogger.info("Have encountered an error adding a like, however not terminating since its not worth.");
				ErrorHelper.scopeConfigureWarning("uploader._attemptToLikeVideo", {
					video_id: videoID,
					vidInfo: vidInfo
				});
				ErrorHelper.emitSimpleError(err);
				return resolve();
			});
		} else {
			return resolve(); // They dont want to automatically like the video
		}
	});
}

function _addExtraPostVideoSettings(youtubeClient, videoID, channelID, vidInfo, folderPath, pmsID) {
	return new Promise(function(resolve, reject) {
		var savedThumbnail = null;

		// First try to add a playlist
		var playlistID = vidInfo.youtube_settings.playlist;
		if (vidInfo.youtube_settings.custom_playlist != null) {
			playlistID = vidInfo.youtube_settings.custom_playlist;
		}

		return _attemptToAddToPlaylist(youtubeClient, videoID, playlistID)
		.then(function() {
			var thumbnailImg = vidInfo.youtube_settings.thumbnails.default_image;
			if (vidInfo.youtube_settings.thumbnails.specific_image != null) {
				thumbnailImg = vidInfo.youtube_settings.thumbnails.specific_image;
			}

			return _attemptToAddVidThumbnail(youtubeClient, videoID, thumbnailImg, folderPath);
		})
		.then(function(addedThumbnail) {
			savedThumbnail = addedThumbnail;
			return _attemptToAddComment(youtubeClient, videoID, channelID, vidInfo.game, pmsID);
		})
		.then(function() {
			return _attemptToLikeVideo(youtubeClient, videoID, vidInfo);
		})
		.then(function() {
			return resolve(savedThumbnail);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
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
			return dbController.getPlaylist(gameName, "LOCAL")
			.then(function(playlistID) {

				var vodTitle = getTitle(gameName, clips, episodeNumber);
				var vodDescription = getDescription(gameName, clips);
				var snippetObj = {
					title: vodTitle,
					description: vodDescription,
					tags: getKeywords(gameName, clips),
					categoryId: Attr.VIDEO_CATEGORY,
					defaultLanguage: Attr.VIDEO_LANGUAGE
				};

				return youtube.videos.insert({
					part: "id,snippet,status",
					notifySubscribers: true,
					requestBody: {
						snippet: snippetObj,
						status: {
							privacyStatus: Attr.VIDEO_VISIBILITY,
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
					let channelID = data.snippet.channelId;

					// Now try to add the playlist if it exists
					return addToYoutubePlaylist(youtube, videoID, playlistID)
					.then(function() {

						// Now try to add the thumbnail if it exists
						return attemptToAddThumbnail(youtube, videoID, clips, gameName)
						.then(function() {
							if (Attr.VIDEO_VISIBILITY == "private") { // Can't post a comment on a private video
								return resolve(videoID);
							}
							return Commenter.addDefaultComment(youtube, videoID, channelID, gameName);
						})
						.then(function() {
							return Rater.likeVideo(youtube, videoID);
						})
						.then(function() {
							return resolve(videoID);
						})
						.catch(function(err) {
							cLogger.info("Have encountered an error adding a thumbnail, however not terminating since its not worth.");
							cLogger.error("The ignored error was: ", err);

							// Can't post a comment on a private video
							if (Attr.VIDEO_VISIBILITY == "private") {
								return resolve(videoID);
							}

							return Commenter.addDefaultComment(youtube, videoID, channelID, gameName)
							.then(function() {
								return Rater.likeVideo(youtube, videoID);
							})
							.then(function() {
								return resolve(videoID);
							})
							.catch(function(err) {
								cLogger.info("Have encountered an error adding a default comment, however not terminating since its not worth.");
								cLogger.error("The ignored error was: ", err);
								return resolve(videoID);
							});
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
				shell.cd(ORIGIN_PATH + "thumbnails/"); // Leave the game directory and into the thumbnails directory
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
				});
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
	var askForSubLikesComments = "\n" + Attr.DEFAULT_LIKE_SUB_TEXT;
	var builtByBot = "\nThis video was clipped, encoded, and uploaded automatically by AutoTuber (twitchautomator.com).";
	var creditsPortion = askForSubLikesComments + builtByBot + "\n\n.\n.\n.\n.\n.\n.\nCredits:\n";

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
