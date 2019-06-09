var Promise = require('bluebird');
var WorkerProducer = require('../worker/worker_producer');
var cLogger = require('color-log');
var ErrorHelper = require('../errors/errors');
const CronJob = require('cron').CronJob;

module.exports.getCronJobs = function() {
	var crons = [];

	// Permanent delete cron job
	crons.push(getPermDeleteCron());
	// Processing cron job
	crons.push(kickOffProcessing());
	// Delete failed intro and outro job
	crons.push(kickOffIntroOutroDeletion());

	return crons;
}

// The permanent delete cron job.
// This cron job initiates the permanent deletion of clips.
// Clips that are listed as over 48 hours get deleted.
function getPermDeleteCron() {
	const midnightCron = "00 00 00 * * *";

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
	const every5MinCron = "3 */5 * * * *";

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
	const every7MinCron = "15 */7 * * * *";

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
