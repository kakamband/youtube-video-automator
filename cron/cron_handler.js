var Promise = require('bluebird');
var cLogger = require('color-log');
var dbController = require('../controller/db');
var Attr = require('../config/attributes');
var shell = require('shelljs');
const CronJob = require('cron').CronJob;
var WorkerProducer = require('../worker/worker_producer');
var ErrorHelper = require('../errors/errors');
var CronDefinitions = require('./cron_definitions');

// init
// Starts the cron job and schedules all the needed tasks
module.exports.init = function() {
	return new Promise(function(resolve, reject) {

		// Get all of the cron jobs
		var jobs = CronDefinitions.getCronJobs();

		// Start all of the cron jobs
		for (var i = 0; i < jobs.length; i++) {
			jobs[i].start();
		}

		return resolve();
	});
}

// permDeleteClips
// Permanently deletes all clips that were marked as deleted greater than 2 days ago.
module.exports.permDeleteClips = function() {
	return new Promise(function(resolve, reject) {
		cLogger.info("Starting permanent delete clips process.");
		return _deleteAllFinishedVideoClips()
		.then(function() {
			return dbController.getAllDeleted();
		})
		.then(function(results) {

			// Nothing to delete
			if (results.length == 0) {
				cLogger.info("Nothing to delete.");
				return resolve();
			}

			var count = 0;
			function next() {
				let currentDeleteObj = results[count];
				var deletedDate = new Date(currentDeleteObj.deleted_at);
				var twoDaysAgo = new Date();
				twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

				if (twoDaysAgo >= deletedDate) {
					cLogger.info("Deleting ID: " + currentDeleteObj.id);
					return dbController.setAsPermanentlyDeleted(currentDeleteObj.id)
					.then(function() {
						return deleteFromS3Bucket(currentDeleteObj.downloaded_file);
					})
					.then(function() {
						return dbController.getAllCustomThumbnails(currentDeleteObj.id);
					})
					.then(function(customThumbnails) {
						return deleteAllCustomThumbnails(customThumbnails);
					})
					.then(function() {
						count++;
						if (count > results.length - 1) {
							return resolve();
						} else {
							return next();
						}
					})
					.catch(function(err) {
						return reject(err);
					});
				} else {
					count++;
					if (count > results.length - 1) {
						return resolve();
					} else {
						return next();
					}
				}
			}

			return next();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.deleteFromS3NowWrapper = function(currentClip) {
	return _deleteClipFromS3NowHelper(currentClip);
}

function _deleteClipFromS3NowHelper(currentClip) {
	return new Promise(function(resolve, reject) {
		if (currentClip.downloaded_file == null || currentClip.downloaded_file == undefined) {
			// Emit this to Sentry
			var err = new Error("Cannot find a downloaded file to delete this clip.");
			ErrorHelper.scopeConfigure("cron_handler._deleteClipFromS3NowHelper", {
				clip: currentClip
			});
			return reject(err);
		}

		var fileNameSplit = currentClip.downloaded_file.split(Attr.CDN_URL);
		var fileNameActual = fileNameSplit[fileNameSplit.length - 1];
		fileNameActual = fileNameActual.substr(1); // Remove the leading '/'

		var cmd = "aws s3 rm s3://" + Attr.AWS_S3_BUCKET_NAME + fileNameActual;
		cLogger.info("Running CMD: " + cmd);
		return shell.exec(cmd, function(code, stdout, stderr) {
			if (code != 0) {
				// Emit this to Sentry
				ErrorHelper.scopeConfigure("cron_handler._deleteClipFromS3NowHelper", {
					clip: currentClip
				});
				return reject(new Error(stderr));
			}

			return resolve();
		});
	})
}

function _possiblyDeleteClip(toBeDeleted) {
	return new Promise(function(resolve, reject) {
		var currentDate = new Date();
		var cantBeDeletedBefore = new Date(toBeDeleted.cant_delete_before);
		var currentClip = null;

		if (currentDate >= cantBeDeletedBefore) {
				return dbController.getDownloadWithVideoURL(toBeDeleted.download_id)
				.then(function(currentClipInfo) {
					currentClip = currentClipInfo;
					return _deleteClipFromS3NowHelper(currentClip);
				})
				.then(function() {
					return dbController.updateDownloadedFileLocation(currentClip.user_id, currentClip.id, currentClip.youtube_link);
				})
				.then(function() {
					return dbController.updateNeedToBeDeleted(toBeDeleted.id, true);
				})
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(err);
				});
		} else {
			return resolve();
		}
	});
}

function _deleteAllFinishedVideoClips() {
	return new Promise(function(resolve, reject) {
		return dbController.getAllNeedToBeDeleted()
		.then(function(results) {
			if (!results || results.length == 0) return resolve();

			var count = 0;
			function next() {
				var currentToBeDeleted = results[count];
				return _possiblyDeleteClip(currentToBeDeleted)
				.then(function() {
					count++;
					if (count <= results.length - 1) {
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

function deleteAllCustomThumbnails(customThumbnails) {
	return new Promise(function(resolve, reject) {
		if (customThumbnails.length == 0) {
			return resolve();
		}

		var count = 0;
		function next() {
			return deleteThumbnailFromBucket(customThumbnails[count])
			.then(function() {
				count++;
				if (count < customThumbnails.length) {
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

function deleteThumbnailFromBucket(thumbnail) {
	return new Promise(function(resolve, reject) {
		if (thumbnail == null || thumbnail.option_value == null | thumbnail.option_value == "") {
			return resolve();
		}

		var fileNameSplit = thumbnail.option_value.split("/");
		var fileNameActual = fileNameSplit[fileNameSplit.length - 1];

		var cmd = "aws s3 rm s3://" + Attr.AWS_S3_BUCKET_NAME + Attr.AWS_S3_THUMBNAIL_PATH + fileNameActual;
		return shell.exec(cmd, function(code, stdout, stderr) {
			if (code != 0) {
				// If this errors just report to sentry and continue
				ErrorHelper.scopeConfigure("cron_handler.deleteThumbnailFromBucket", {error: stderr});
				ErrorHelper.emitSimpleError(new Error("Failed to delete thumbnail from s3."));
			}

			return resolve();
		});
	});
}

function deleteFromS3Bucket(fileName) {
	return new Promise(function(resolve, reject) {
		// If the filename doesn't exist (null) for whatever case just continue
		if (fileName == null || fileName == "") {
			return resolve();
		}

		// If the file for whatever reason was not uploaded to S3 just continue
		if (fileName.indexOf(Attr.CDN_URL) < 0) {
			return resolve();
		}

		var fileNameSplit = fileName.split(Attr.AWS_S3_BUCKET_VIDEO_PATH);
		var fileNameActual = fileNameSplit[fileNameSplit.length - 1];

		var cmd = "aws s3 rm s3://" + Attr.AWS_S3_BUCKET_NAME + Attr.AWS_S3_BUCKET_VIDEO_PATH + fileNameActual;
		cLogger.info("Running cmd: " + cmd);
		return shell.exec(cmd, function(code, stdout, stderr) {
			if (code != 0) {
				// If this errors just report to sentry and continue
				ErrorHelper.scopeConfigure("cron_handler.deleteFromS3Bucket", {error: stderr});
				ErrorHelper.emitSimpleError(new Error("Failed to delete from s3."));
			}

			return resolve();
		});
	});
}
