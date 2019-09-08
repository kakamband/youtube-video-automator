var Promise = require('bluebird');
var WorkerProducer = require('../worker/worker_producer');
var cLogger = require('color-log');
var ErrorHelper = require('../errors/errors');
const CronJob = require('cron').CronJob;
var shell = require('shelljs');

// Cron schedules
const midnightCron = "00 00 00 * * *";
const every5MinCron = "3 */5 * * * *";
const every7MinCron = "15 */7 * * * *";
const everySundayCron = "* * * * * *"; //"00 00 00 * * 0";

module.exports.getCronJobs = function() {
	var crons = [
		getPermDeleteCron(), 		 // Permanent delete cron job
		kickOffProcessing(), 		 // Processing cron job
		kickOffIntroOutroDeletion(), // Delete failed intro and outro job
		kickOffDeleteLogs(), 		 // Delete Logs cron job
	];

	return crons;
}

// The permanent delete cron job.
// This cron job initiates the permanent deletion of clips.
// Clips that are listed as over 48 hours get deleted.
function getPermDeleteCron() {
	var permanentDeleteCron = new CronJob(midnightCron, function() {
		WorkerProducer.startPermDeleteCycle()
		.then(function() {
			// Done.
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure("cron_handler.init", {job_name: "perm_delete_job"});
			ErrorHelper.emitSimpleError(err);
		});
	});

	return permanentDeleteCron;
}

// The kick off processing cron job.
// This cron job initiates videos that need to start to be processed.
// This runs every 5 minutes.
function kickOffProcessing() {
	var kickOffProcessingCron = new CronJob(every5MinCron, function() {
		WorkerProducer.startProcessingCycle()
		.then(function() {
			// Done.
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure("cron_handler.init", {job_name: "kick_off_processing"});
			ErrorHelper.emitSimpleError(err);
		});
	});

	return kickOffProcessingCron;
}

// The kick off deleting failed intro and outro uploads.
// This cron job deletes any failed intro and outro uploads.
// This runs every 7 minutes.
function kickOffIntroOutroDeletion() {
	var kickOffFailedIntroOutroCron = new CronJob(every7MinCron, function() {
		WorkerProducer.startIntrosOutrosDeleteCycle()
		.then(function() {
			// Done.
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure("cron_handler.init", {job_name: "kick_off_intro_outro_deletion"});
			ErrorHelper.emitSimpleError(err);
		});
	});

	return kickOffFailedIntroOutroCron;
}

// The kick off deleting logs cron job
// This job deletes the pm2 logs on a weekly basis (keep log sizes down + lower possible costs)
// This runs every 7 days
function kickOffDeleteLogs() {
	var kickOffDeleteLogsCron = new CronJob(everySundayCron, function() {
		return shell.exec("pm2 flush", function(code, stdout, stderr) {
			if (code != 0) {
				ErrorHelper.scopeConfigure("cron_handler.init", {job_name: "kickOffDeleteLogs"});
				ErrorHelper.emitSimpleError(stderr);
			}

			cLogger.info("Done flushing logs.");
			// Done
		});
	});

	return kickOffDeleteLogsCron;
}
