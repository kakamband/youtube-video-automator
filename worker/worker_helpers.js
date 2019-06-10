var Promise = require('bluebird');
var cLogger = require('color-log');
var Hijacker = require('../hijacker/hijacker');
var dbController = require('../controller/db');
var ErrorHelper = require('../errors/errors');
var Attr = require('../config/attributes');
var shell = require('shelljs');
var WorkerProducer = require('./worker_producer');
var CronHandler = require('../cron/cron_handler');
const { getVideoDurationInSeconds } = require('get-video-duration');
var Users = require('../users/users');
var Downloader = require('../downloader/downloader');
var Combiner = require('../combiner/combiner');
var Uploader = require('../uploader/uploader');

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// The CDN URL
const cdnURL = Attr.CDN_URL;

const downloadingClipNotification = "currently-clipping";
const needTitleOrDescriptionNotification = "need-title-or-description";
const videoProcessingNotification = "currently-processing";
const videoUploadingNotification = "currently-uploading";
const videoDoneUploadingNotification = "done-uploading";
// The names of all of the clip flow notifications, this is used to clear when adding a new one.
const clipFlowNotifications = [downloadingClipNotification, needTitleOrDescriptionNotification, videoProcessingNotification, videoUploadingNotification, videoDoneUploadingNotification];

// downloadContent
// Initiates a download of content for a user
module.exports.downloadContent = function(userID, gameName, twitchStream, downloadID) {
	return new Promise(function(resolve, reject) {
		cLogger.info("Starting to download content for user: " + userID + " and the following game and stream: " + gameName + " (" + twitchStream + ")");
		return Hijacker.startHijack(userID, gameName, twitchStream, downloadID)
		.then(function() {
			cLogger.info("Done hijacking. Starting transfer to S3.");
			return WorkerProducer.addTransferFileToS3Task(userID, twitchStream, downloadID);
		})
		.then(function() {
			return dbController.updateStateBasedOnTitleDesc(userID, downloadID);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// transferToS3
// Transfers a file to the S3 bucket
module.exports.transferToS3 = function(userID, twitchStream, downloadID) {
	return new Promise(function(resolve, reject) {
		return setTimeout(function() {
			return transferToS3Helper(userID, twitchStream, downloadID)
			.then(function() {
				return resolve();
			})
			.catch(function(err) {
				return reject(err);
			});
		}, 5000);
	});
}

// decrementMsgCount
// Decrements the msg count in redis
module.exports.decrementMsgCount = function(workerName) {
	return decrKeyV2(workerName);
}

// setupWorkerChannels
// Wrapper for WorkerProducer.initProducers()
module.exports.setupWorkerChannels = function() {
	return WorkerProducer.initProducers();
}

// permDeleteWrapper
// Wrapper for CronHandler.permDeleteClips()
module.exports.permDeleteWrapper = function() {
	return CronHandler.permDeleteClips();
}

// handleGracefulShutdown
// Handles gracefully shutting down this worker, updates the DB accordingly to specify that the worker is no longer able to accept messages
module.exports.handleGracefulInitAndShutdown = function(workerType) {
	return dbController.workerStartingUp(workerType)
	.then(function() {
		// Handle PM2 shutdowns gracefully
		process.on('SIGINT', function() {
			console.log("Shutting down " + workerType + " worker.");
			return dbController.workerShuttingDown(workerType)
			.then(function() {
				process.exit(0);
			})
			.catch(function(err) {
				ErrorHelper.scopeConfigure("worker_helpers.handleGracefulInitAndShutdown", {
					"message": "We are not tracking worker terminations! This is very dangerous!!"
				});
				ErrorHelper.emitSimpleError(err);
				process.exit(1);
			});
		});
	})
	.catch(function(err) {
		ErrorHelper.scopeConfigure("worker_helpers.handleGracefulInitAndShutdown", {
			"message": "We are not tracking worker initializations! This is very dangerous!!"
		});
		ErrorHelper.emitSimpleError(err);
	});
}

// checkForVideosToProcess
// Checks to see if any videos are prepared for processing, and kicks them off if there is any.
module.exports.checkForVideosToProcess = function() {
	return new Promise(function(resolve, reject) {
		return dbController.getAllProcessingReadyVideos()
		.then(function(possibleVideos) {
			return queueVideosToProcess(possibleVideos);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// introOutroDeleteTask
// Starts deleting any intros or outros that have failed to be uploaded (ie. 10min since last update)
module.exports.introOutroDeleteTask = function() {
	return new Promise(function(resolve, reject) {
		return dbController.getAllIntroOutrosToDelete()
		.then(function(staleUploads) {
			return deleteAllStaleIntrosOutros(staleUploads);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// startVideoProcessing
// Starts processing a video, and then kicks off the upload of the video.
module.exports.startVideoProcessing = function(userID, pmsID, downloadID, allClipIDs, intro, outro) {
	return new Promise(function(resolve, reject) {
		var combinedVideos = [];
		var finalFileLocation = null;

		return dbController.setNotificationsSeen(pmsID, clipFlowNotifications)
		.then(function() {
			return dbController.createProcessingNotification(pmsID, JSON.stringify({download_id: downloadID}));
		})
		.then(function() {
			return dbController.getAllDownloadsIn(allClipIDs);
		})
		.then(function(allDownloads) {
			combinedVideos = allDownloads;
			
			combinedVideos.sort(function(a, b) {
		    	return a.order_number - b.order_number;
			});

			return Downloader.validateClipsCanBeProcessed(userID, pmsID, combinedVideos);
		})
		.then(function(isValid) {
			if (!isValid) {
				return Promise.reject(new Error("The clips cannot be processed. Processing terminated."));
			} else {
				return Downloader.downloadEachAWSClip(userID, combinedVideos);
			}
		})
		.then(function(downloadLocation) {
			finalFileLocation = downloadLocation;
			return Downloader.possiblyDownloadIntroOutro(finalFileLocation, intro, outro);
		})
		.then(function(updatedValues) {
			intro = updatedValues[0];
			outro = updatedValues[1];
			return Combiner.combineAllUsersClips(pmsID, finalFileLocation, combinedVideos, intro, outro);
		})
		.then(function() {
			return preliminaryUploadingStep(userID, pmsID, downloadID, combinedVideos);
		})
		.then(function() {
			return WorkerProducer.queueVideoToUpload(userID, pmsID, downloadID, finalFileLocation, allClipIDs);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			// Fail Safely
			return _processingFailedHandler(userID, pmsID, allClipIDs, err)
			.then(function() {
				return resolve();
			})
			.catch(function(err) {
				return reject(err);
			});
		});
	});
}

// startVideoUploading
// Starts uploading a video to Youtube
module.exports.startVideoUploading = function(userID, pmsID, downloadID, fileLocation, allClipIDs) {
	return new Promise(function(resolve, reject) {
		var vidInfo = null;
		var youtubeVideoURL = null;
		var savedThumbnail = null;

		return dbController.setNotificationsSeen(pmsID, clipFlowNotifications)
		.then(function() {
			return dbController.createUploadingNotification(pmsID, JSON.stringify({download_id: downloadID}));
		})
		.then(function() {
			return Users.getClipInfoWrapper(userID, pmsID, downloadID);
		})
		.then(function(videoInfo) {
			vidInfo = videoInfo;
			return Uploader.validateVideoCanBeUploaded(userID, pmsID, downloadID, fileLocation, vidInfo);
		})
		.then(function(isValid) {
			if (!isValid) {
				return Promise.reject(new Error("The video cannot be uploaded. Uploading terminated."));
			} else {
				return Uploader.uploadUsersVideo(userID, pmsID, downloadID, fileLocation, vidInfo);
			}
		})
		.then(function(youtubeVidInfo) {
			youtubeVideoURL = youtubeVidInfo[0];
			savedThumbnail = youtubeVidInfo[1];

			return dbController.setNotificationsSeen(pmsID, clipFlowNotifications);
		})
		.then(function() {
			return dbController.createDoneUploadingNotification(pmsID, JSON.stringify({download_id: downloadID, video_url: youtubeVideoURL}));
		})
		.then(function() {
			return dbController.uploadingDoneForDownloads(userID, allClipIDs);
		})
		.then(function() {
			return dbController.setUserVidNotProcessing(userID, pmsID);
		})
		.then(function() {
			return dbController.addYoutubeVideo({
				user_id: userID,
				game: vidInfo.game,
				url: youtubeVideoURL,
				created_at: new Date(),
				updated_at: new Date(),
				video_number: vidInfo.video_number,
				thumbnail: savedThumbnail
			}, pmsID);
		})
		.then(function() {
			return _deleteVideosFromS3AfterUpload(userID, pmsID, allClipIDs, youtubeVideoURL);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			// Fail Safely
			return _uploadingFailedHandler(userID, pmsID, allClipIDs, err)
			.then(function() {
				return resolve();
			})
			.catch(function(err) {
				return reject(err);
			});
		});
	});
}

// --------------------------------------------
// Exported compartmentalized functions above.
// --------------------------------------------
// Helper functions below.
// --------------------------------------------

function _deleteFileHelper(filepath) {
    return new Promise(function(resolve, reject) {
        var rmCMD = "rm " + filepath;
        cLogger.info("Running CMD: " + rmCMD);
        return shell.exec(rmCMD, function(code, stdout, stderr) {
            if (code != 0) {
                return reject(stderr);
            }

            return resolve();
        });
    });
}

function _deleteClipsFromS3Now(userID, pmsID, allClipIDs, youtubeVideoURL) {
	return new Promise(function(resolve, reject) {
		return dbController.getAllDownloadsIn(allClipIDs)
		.then(function(allDownloads) {
			var count = 0;
			if (!allDownloads || allDownloads.length <= 0) return resolve();

			function next() {
				var currentClip = allDownloads[count];
				return CronHandler.deleteFromS3NowWrapper(currentClip)
				.then(function() {
					return dbController.updateDownloadedFileLocation(userID, currentClip.id, youtubeVideoURL);
				})
				.then(function() {
					return dbController.insertIntoNeedToBeDeleted({
						download_id: currentClip.id + "",
						cant_delete_before: new Date(), // Doesnt matter due to attribute below
						deleted: true,
						created_at: new Date(),
						updated_at: new Date()
					});
				})
				.then(function() {
					count++;
					if (count <= allDownloads.length - 1) {
						return next();
					} else {
						return resolve();
					}
				})
				.catch(function(err) {
					return reject(err);
				});
			}

			return next();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _deleteClipsIn48Hours(userID, pmsID, allClipIDs) {
	return new Promise(function(resolve, reject) {
		if (allClipIDs.length == 0) return resolve();

		var count = 0;
		var earliestDeletionTime = new Date();
		earliestDeletionTime.setDate(earliestDeletionTime.getDate() + 2); // Add 48 hours to this time
		function next() {
			var currentClipID = allClipIDs[count];
			return dbController.insertIntoNeedToBeDeleted({
				download_id: currentClipID + "",
				cant_delete_before: earliestDeletionTime.toString(),
				deleted: false,
				created_at: new Date(),
				updated_at: new Date()
			})
			.then(function() {
				count++;
				if (count <= allClipIDs.length - 1) {
					return next();
				} else {
					return resolve();
				}
			})
			.catch(function(err) {
				return reject(err);
			});
		}

		return next();
	});
}

function _deleteVideosFromS3AfterUpload(userID, pmsID, allClipIDs, youtubeVideoURL) {
	return new Promise(function(resolve, reject) {
		return dbController.getActiveSubscriptionWrapper(pmsID)
		.then(function(subscriptionInfo) {
			let activeSubscriptionID = subscriptionInfo[0];
			let numberOfVideosLeft = subscriptionInfo[1];
			let userBanned = subscriptionInfo[2];
			let userBannedReason = subscriptionInfo[3];

			var activeSubscriptionInfo = Attr.SUBSCRIPTION_VIDEO_CAPS.get(activeSubscriptionID);
			if (activeSubscriptionInfo == undefined || activeSubscriptionInfo.name == "Basic" || userBanned == true) { // Delete immediately
				return _deleteClipsFromS3Now(userID, pmsID, allClipIDs, youtubeVideoURL)
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(err);
				});
			} else if (activeSubscriptionInfo.name == "Professional") { // Don't delete
				return resolve();
			} else { // Delete in 48 hours
				return _deleteClipsIn48Hours(userID, pmsID, allClipIDs)
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(err);
				});
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _uploadingFailedHandler(userID, pmsID, allClipIDs, err) {
	return new Promise(function(resolve, reject) {
		// Emit this to Sentry
		ErrorHelper.scopeConfigure("worker_helpers._uploadingFailedHandler", {
			"message": "Uploading has failed, the download states have been updated accordingly.",
			user_id: userID,
			pms_id: pmsID,
			all_clip_id: allClipIDs
		});
		ErrorHelper.emitSimpleError(err);

		return dbController.uploadingFailedForDownloads(userID, allClipIDs)
		.then(function() {
			return dbController.setUserVidNotProcessing(userID, pmsID);
		})
		.then(function() {
			return dbController.setNotificationsSeen(pmsID, clipFlowNotifications);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _processingFailedHandler(userID, pmsID, allClipIDs, err) {
	return new Promise(function(resolve, reject) {
		// Emit this to Sentry
		ErrorHelper.scopeConfigure("worker_helpers._processingFailedHandler", {
			"message": "Processing has failed, the download states have been updated accordingly.",
			user_id: userID,
			pms_id: pmsID,
			all_clip_id: allClipIDs
		});
		ErrorHelper.emitSimpleError(err);

		return dbController.processingFailedForDownloads(userID, allClipIDs)
		.then(function() {
			return dbController.setUserVidNotProcessing(userID, pmsID);
		})
		.then(function() {
			return dbController.setNotificationsSeen(pmsID, clipFlowNotifications);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function deleteAllStaleIntrosOutros(staleUploads) {
	return new Promise(function(resolve, reject) {
		var count = 0;
		if (staleUploads <= 0) return resolve();

		function nextPossibleHelper() {
			count++;
			if (count <= staleUploads.length - 1) {
				return next();
			} else {
				return resolve();
			}
		}

		function next() {
			var currentStaleUpload = staleUploads[count];
			var originalFileLocation = currentStaleUpload.file_location;

			cLogger.info("Deleting failed intro/outro upload of ID: " + currentStaleUpload.id);
			return dbController.setIntroOutroFailed(currentStaleUpload.id)
			.then(function() {
				return _deleteFileHelper(originalFileLocation);
			})
			.then(function() {
				return nextPossibleHelper();
			})
			.catch(function(err) {
				return reject(err);
			});
		}

		return next();
	})
}

function queueVideosToProcess(possibleVideos) {
	return new Promise(function(resolve, reject) {
		var count = 0;
		if (possibleVideos.length <= 0) return resolve();

		function nextPossibleHelper() {
			count++;
			if (count <= possibleVideos.length - 1) {
				return next();
			} else {
				return resolve();
			}
		}

		function next() {
			var currentVid = possibleVideos[count];

			cLogger.info("Checking if the following video (" + currentVid.id + ") can be processed.");
			return Users.getClipInfoWrapper(currentVid.user_id, currentVid.pms_user_id, currentVid.id)
			.then(function(info) {

				// If the processing estimate has already been set in the DB.
				var processingStartEstimate = info.processing_start_estimate;
				if (currentVid.expected_processing_time != null) {
					processingStartEstimate = currentVid.expected_processing_time;
				}

				var cantProcessValues = ["still_currently_clipping", "currently_processing", "currently_uploading", "clip_deleted", "need_title_description_first", null];

				if (cantProcessValues.indexOf(processingStartEstimate) >= 0) {
					// This video is in a state which we can't process so either continue, or end.
					cLogger.mark("The following video has a process starting estimate (" + processingStartEstimate + ") that we can't process.");
					return nextPossibleHelper();
				} else {
					var currentDate = new Date();
					var expectedStartDate = new Date(processingStartEstimate);

					// This video is in a state where we can continue. Now make sure that the current time has surpassed the expected processing time
					if (expectedStartDate >= currentDate) {
						// This video is expected to start processing, however not yet. So either continue, or end.
						cLogger.mark("The following video has a start processing estimate that is in the future (" + expectedStartDate + ").");
						return nextPossibleHelper();
					} else {
						// This video is in a state where we CAN start processing it. So just add it to the end of the encoder queue.
						// So first make sure that the user is marked as currently processing. Then change the download state to be processing.
						return preliminaryProcessingStep(currentVid.user_id, currentVid.pms_user_id, currentVid.id, info.videos_to_combine)
						.then(function() {
							// Get all of the videos that will be combined into a an array
							var toCombineIDs = [currentVid.id];
							for (var i = 0; i < info.videos_to_combine.length; i++) {
								toCombineIDs.push(info.videos_to_combine[i].id);
							}

							// Queue this video up for processing.
							cLogger.mark("The video can, and will being processing.");
							return WorkerProducer.queueVideoToProcess(currentVid.user_id, currentVid.pms_user_id, currentVid.id, toCombineIDs, info.youtube_settings.video_intro, info.youtube_settings.video_outro);
						})
						.then(function() {
							return nextPossibleHelper();
						})
						.catch(function(err) {
							return reject(err);
						});
					}
				}
			})
			.catch(function(err) {
				return reject(err);
			});
		}

		return next();
	});
}

function preliminaryUploadingStep(userID, pmsID, downloadID, combinedVideos) {
	return new Promise(function(resolve, reject) {
		return dbController.setUserVidProcessing(userID, pmsID)
		.then(function() {
			// Set the latest clipped video to be processing, and used.
			return dbController.setDownloadUploading(downloadID);
		})
		.then(function() {
			var count = 0;
			if (combinedVideos == null || combinedVideos.length <= 0) return Promise.resolve();

			// Set all the other combined videos to be processing, and used.
			function next() {
				return dbController.setDownloadUploading(combinedVideos[count].id)
				.then(function() {
					count++;
					if (count <= combinedVideos.length - 1) {
						return next();
					} else {
						return Promise.resolve();
					}
				})
				.catch(function(err) {
					return reject(err);
				});
			}

			return next();
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function preliminaryProcessingStep(userID, pmsID, downloadID, combinedVideos) {
	return new Promise(function(resolve, reject) {
		var vidNumber = null;

		return dbController.setUserVidProcessing(userID, pmsID)
		.then(function() {
			// Get the count for the video
			return dbController.getVideoCountNumber(userID);
		})
		.then(function(videoNumber) {
			vidNumber = videoNumber;

			// Set the latest clipped video to be processing, and used.
			return dbController.setDownloadProcessing(downloadID, vidNumber);
		})
		.then(function() {
			var count = 0;
			if (combinedVideos == null || combinedVideos.length <= 0) return Promise.resolve();

			// Set all the other combined videos to be processing, and used.
			function next() {
				return dbController.setDownloadProcessing(combinedVideos[count].id, vidNumber)
				.then(function() {
					count++;
					if (count <= combinedVideos.length - 1) {
						return next();
					} else {
						return Promise.resolve();
					}
				})
				.catch(function(err) {
					return reject(err);
				});
			}

			return next();
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function transferToS3Helper(userID, twitchStream, downloadID) {
	var downloadObj = null;
	var oldFileLocation = null;
	var cdnFile = null;

	return new Promise(function(resolve, reject) {
		return dbController.getDownload(userID, downloadID)
		.then(function(result) {
			downloadObj = result;

			if (result == undefined) {
				// This shouldn't ever happen, log to sentry if it does.
				ErrorHelper.scopeConfigureWID("worker_helpers.transferToS3", {
					download_id: downloadID,
				}, (userID + ""));
				ErrorHelper.emitSimpleError(new Error("Could not find download associated with file. Failed to transfer to S3."));
				return resolve();
			} else {
				if (result.state != "done" && result.state != "done-need-info" && result.state != "deleted-soon") {
					// This shouldn't ever happen, log to sentry if it does.
					ErrorHelper.scopeConfigureWID("worker_helpers.transferToS3", {
						download_obj: result
					}, (userID + ""));
					ErrorHelper.emitSimpleError(new Error("The download is not in the done state, can't upload to S3."));
					return resolve();
				}
				if (result.downloaded_file == null || !result.downloaded_file || result.downloaded_file == "") {
					// This shouldn't ever happen, log to sentry if it does.
					ErrorHelper.scopeConfigureWID("worker_helpers.transferToS3", {
						download_obj: result
					}, (userID + ""));
					ErrorHelper.emitSimpleError(new Error("The downloaded file attribute is not in a usuable state, can't upload to S3."));
					return resolve();
				}

				return uploadFileToS3(result.downloaded_file);
			}
		})
		.then(function() {
			oldFileLocation = downloadObj.downloaded_file;
			var filenameSplit = downloadObj.downloaded_file.split("/");
			var fileNameActual = filenameSplit[filenameSplit.length - 1];
			cdnFile = cdnURL + "/" + Attr.AWS_S3_BUCKET_VIDEO_PATH + fileNameActual;
			return dbController.updateDownloadedFileLocation(userID, downloadID, cdnFile);
		})
		.then(function() {
			return updateClipSeconds(oldFileLocation, downloadObj);
		})
		.then(function() {
			return deleteOldFile(oldFileLocation);
		})
		.then(function() {
			return addClipVideoCacheItem(cdnFile, downloadID);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function addClipVideoCacheItem(cdnFile, downloadID) {
    let clipVideoKey = "redis_clip_video_" + downloadID;
    return new Promise(function(resolve, reject) {
		var multi = redis.multi();
    	multi.set(clipVideoKey, cdnFile, "EX", 3600); // 1 hour
    	multi.exec(function (err, replies) {
    		return resolve();
    	});
    });
}

function decrKeyV2(workerName) {
	return new Promise(function(resolve, reject) {
		return dbController.workerNoLongerUtilized(workerName)
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function decrKey(key) {
	return new Promise(function(resolve, reject) {
		var multi = redis.multi();
		multi.decr(key);
		multi.exec(function (err, replies) {
		    return resolve();
		});
	});
}

function _uploadFileToS3(file) {
	return new Promise(function(resolve, reject) {
		var cmd = "aws s3 cp " + file + " s3://" + Attr.AWS_S3_BUCKET_NAME + Attr.AWS_S3_BUCKET_VIDEO_PATH + " --acl public-read --content-disposition attachment";
		cLogger.info("Running CMD: " + cmd);
		return shell.exec(cmd, function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			return resolve();
		});
	});
}

function uploadFileToS3(file) {
	const maxAttempts = 15;

	return new Promise(function(resolve, reject) {

		var count = 0;
		function next() {
			return _uploadFileToS3(file)
			.then(function() {
				return resolve();
			})
			.catch(function(err) {
				count++;
				if (count > maxAttempts) {
					return reject(err);
				} else {
					cLogger.info("Uploading to S3 isn't available yet. Waiting 500ms and restarting.");
					return setTimeout(function() {
						return next();
					}, 500);
				}
			});
		}

		return next();
	});
}

function updateClipSeconds(fileLocation, downloadObj) {
	return new Promise(function(resolve, reject) {
		return checkFileDurations(fileLocation)
		.then(function(durationSeconds) {
			var secondsParsed = parseInt(durationSeconds);

			var newDownloadUpdatedAt = new Date(downloadObj.created_at);
			newDownloadUpdatedAt.setSeconds(newDownloadUpdatedAt.getSeconds() + secondsParsed);
			return dbController.updateDownloadDuration(downloadObj.id, secondsParsed, newDownloadUpdatedAt);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {

			// Don't error out, just log to Sentry and continue.
			ErrorHelper.scopeConfigureWarning("worker_helpers.updateClipSeconds", {
				"message": "We could not update the clip seconds for whatever reason, not too big of a deal."
			});
			ErrorHelper.emitSimpleError(err);
			return resolve();
		});
	});
}

function deleteOldFile(file) {
	return new Promise(function(resolve, reject) {
		var cmd = "rm " + file;
		cLogger.info("Running cmd: " + cmd);
		return shell.exec(cmd, function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			return resolve();
		});
	});
}

function checkFileDurations(file) {
	return new Promise(function(resolve, reject) {
		return getVideoDurationInSeconds(file).then((duration) => {
			return resolve(duration);
		});
	});
}

// --------------------------------------------
// Helper functions above.
// --------------------------------------------