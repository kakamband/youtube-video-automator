var Promise = require('bluebird');
var cLogger = require('color-log');
var Hijacker = require('../hijacker/hijacker');
var dbController = require('../controller/db');
var ErrorHelper = require('../errors/errors');
var Attr = require('../config/attributes');
var shell = require('shelljs');
var WorkerProducer = require('./worker_producer');
var CronHandler = require('../cron/cron_handler');

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// The CDN URL
const cdnURL = "https://d2b3tzzd3kh620.cloudfront.net";

// downloadContent
// Initiates a download of content for a user
module.exports.downloadContent = function(userID, gameName, twitchStream, downloadID) {
	return new Promise(function(resolve, reject) {
		cLogger.info("Starting to download content for user: " + userID + " and the following game and stream: " + gameName + " (" + twitchStream + ")");
		Hijacker.ADBuster(twitchStream)
		.then(function() {
			return Hijacker.startHijack(userID, gameName, twitchStream, downloadID);
		})
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
		return transferToS3Helper(userID, twitchStream, downloadID)
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// decrementMsgCount
// Decrements the msg count in redis
module.exports.decrementMsgCount = function(key) {
	return decrKey(key);
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

// --------------------------------------------
// Exported compartmentalized functions above.
// --------------------------------------------
// Helper functions below.
// --------------------------------------------

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
				if (result.state != "done" && result.state != "done-need-info") {
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
		var cmd = "aws s3 cp " + file + " s3://" + Attr.AWS_S3_BUCKET_NAME + Attr.AWS_S3_BUCKET_VIDEO_PATH + " --acl public-read";
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

// --------------------------------------------
// Helper functions above.
// --------------------------------------------