var Promise = require('bluebird');
var WorkerProducer = require('../worker/worker_producer');
var cLogger = require('color-log');
var ErrorHelper = require('../errors/errors');
const CronJob = require('cron').CronJob;

module.exports.getCronJobs = function() {
	var crons = [];

	// Permanent delete cron job
	crons.push(getPermDeleteCron());

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
			cLogger.info("Done posting permanent delete cycle.");
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure("cron_handler.init", {job_name: "perm_delete_job"});
			ErrorHelper.emitSimpleError(err);
		});
	});

	return permanentDeleteCron;
}