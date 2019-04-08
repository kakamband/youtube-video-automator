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
		return dbController.getAllDeleted()
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

function deleteFromS3Bucket(fileName) {
	return new Promise(function(resolve, reject) {
		// If the filename doesn't exist (null) for whatever case just continue
		if (fileName == null || fileName == "") {
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
