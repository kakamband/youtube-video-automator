var Promise = require('bluebird');
var Helpers = require('./worker_helpers');
const Sentry = require('@sentry/node');
var cLogger = require('color-log');
var Attr = require('../config/attributes');
var DefinedErrors = require('../errors/defined_errors');

module.exports.handleMessage = function(ch, message, msg, workerType) {
	switch (message) {
    case "downloading_task":
    	return handleDownloadingTask(ch, msg, message, workerType);
    case "transfer_video_task":
    	return handleTransferVideo(ch, msg, message, workerType);
    case "uploading_start":
    	return handleUploadingStart(ch, msg, message, workerType);
   	case "processing_cycle_start":
   		return handleProcessingCycleStart(ch, msg, message, workerType);
	case "processing_start":
		return handleProcessingStart(ch, msg, message, workerType);
    case "permanent_delete_task":
    	return handlePermDeleteTask(ch, msg, message, workerType);
	case "transfer_intro_outro_task":
		return handleTransferIntroOutro(ch, msg, message, workerType);
	default:
		Sentry.withScope(scope => {
			scope.setTag("scope", "server-worker-" + workerType);
			scope.setTag("environment", Attr.ENV);
			scope.setExtra("msg", msg);

			cLogger.error(DefinedErrors.unidentifiedWorkerMessage());
			Sentry.captureException(DefinedErrors.unidentifiedWorkerMessage());
		});
		return;
  }
}

function handlePermDeleteTask(ch, msg, message, workerType) {
	return Helpers.permDeleteWrapper()
	.then(function() {
		successMsg(message);
		return Helpers.decrementMsgCount(workerType);
	})
	.then(function() {
		ch.ack(msg);
	})
	.catch(function(err) {
		errMsg(message, msg, message, err, workerType);
		return Helpers.decrementMsgCount(workerType)
		.then(function() {
			ch.ack(msg);
		})
		.catch(function(err) {
			Sentry.captureException(err);
			ch.ack(msg);
		});
	});
}

function handleProcessingStart(ch, msg, message, workerType) {
	var userID = msg.properties.correlationId;
	var pmsID = msg.properties.contentType;
	var allClipIDs = JSON.parse(msg.properties.contentEncoding);
	var downloadID = parseInt(msg.properties.messageId);
	cLogger.info("Starting to process a video (DownloadID: " + downloadID + ").");

	return Helpers.startVideoProcessing(userID, pmsID, downloadID, allClipIDs)
	.then(function() {
		successMsg(message);
		return Helpers.decrementMsgCount(workerType);
	})
	.then(function() {
		ch.ack(msg);
	}).catch(function(err) {
		errMsg(message, msg, message, err, workerType);
		return Helpers.decrementMsgCount(workerType)
		.then(function() {
			ch.ack(msg);
		})
		.catch(function(err) {
			Sentry.captureException(err);
			ch.ack(msg);
		});
	});
}

function handleProcessingCycleStart(ch, msg, message, workerType) {
	return Helpers.checkForVideosToProcess()
	.then(function() {
		successMsg(message);
		return Helpers.decrementMsgCount(workerType);
	})
	.then(function() {
		ch.ack(msg);
	}).catch(function(err) {
		errMsg(message, msg, message, err, workerType);
		return Helpers.decrementMsgCount(workerType)
		.then(function() {
			ch.ack(msg);
		})
		.catch(function(err) {
			Sentry.captureException(err);
			ch.ack(msg);
		});
	});
}

function handleDownloadingTask(ch, msg, message, workerType) {
	var userID = msg.properties.correlationId;
	var gameName = msg.properties.contentType;
	var twitchStream = msg.properties.contentEncoding;
	var downloadID = parseInt(msg.properties.messageId);
	cLogger.info("Starting a downloading task.");

	return Helpers.downloadContent(userID, gameName, twitchStream, downloadID)
	.then(function() {
		successMsg(message);
		return Helpers.decrementMsgCount(workerType);
	}).then(function() {
		ch.ack(msg);
	}).catch(function(err) {
		errMsg(message, msg, message, err, workerType);
		return Helpers.decrementMsgCount(workerType)
		.then(function() {
			ch.ack(msg);
		})
		.catch(function(err) {
			Sentry.captureException(err);
			ch.ack(msg);
		});
	});
}

function handleTransferIntroOutro(ch, msg, message, workerType) {
	var userID = msg.properties.correlationId;
	var pmsID = msg.properties.messageId;
	var extraData = JSON.parse(msg.properties.contentEncoding);
	var gameName = extraData.game;
	var introOrOutro = extraData.intro_or_outro;
	var newFileName = extraData.new_file_name;
	var fileLocation = extraData.file_location;
	cLogger.info("Starting a transfer an intro to outro to S3 task.");

	return Helpers.transferIntroOutroToS3(userID, pmsID, gameName, introOrOutro, newFileName, fileLocation)
	.then(function() {
		successMsg(message);
		return Helpers.decrementMsgCount(workerType);
	})
	.then(function() {
		ch.ack(msg);
	}).catch(function(err) {
		errMsg(message, msg, message, err, workerType);
		return Helpers.decrementMsgCount(workerType)
		.then(function() {
			ch.ack(msg);
		})
		.catch(function(err) {
			Sentry.captureException(err);
			ch.ack(msg);
		});
	});
}

function handleTransferVideo(ch, msg, message, workerType) {
	var userID = msg.properties.correlationId;
	var twitchStream = msg.properties.contentEncoding;
	var downloadID = parseInt(msg.properties.messageId);
	cLogger.info("Starting a transfer to S3 task.");

	return Helpers.transferToS3(userID, twitchStream, downloadID)
	.then(function() {
		successMsg(message);
		return Helpers.decrementMsgCount(workerType);
	})
	.then(function() {
		ch.ack(msg);
	}).catch(function(err) {
		errMsg(message, msg, message, err, workerType);
		return Helpers.decrementMsgCount(workerType)
		.then(function() {
			ch.ack(msg);
		})
		.catch(function(err) {
			Sentry.captureException(err);
			ch.ack(msg);
		});
	});
}

function handleUploadingStart(ch, msg, message, workerType) {
	var userID = msg.properties.correlationId;
	var pmsID = msg.properties.contentType;
	var fileLocation = msg.properties.contentEncoding;
	var downloadID = parseInt(msg.properties.messageId);
	var allClipIDs = JSON.parse(msg.properties.type);
	cLogger.info("Starting to upload a video (DownloadID: " + downloadID + ").");

	return Helpers.startVideoUploading(userID, pmsID, downloadID, fileLocation, allClipIDs)
	.then(function() {
		successMsg(message);
		return Helpers.decrementMsgCount(workerType);
	})
	.then(function() {
		ch.ack(msg);
	}).catch(function(err) {
		errMsg(message, msg, message, err, workerType);
		return Helpers.decrementMsgCount(workerType)
		.then(function() {
			ch.ack(msg);
		})
		.catch(function(err) {
			Sentry.captureException(err);
			ch.ack(msg);
		});
	});
}

function errMsg(workerActivity, ackMsg, queueMessage, err, workerType) {
  Sentry.withScope(scope => {
    scope.setTag("scope", "server-worker-" + workerType);
    scope.setTag("environment", Attr.ENV);
    scope.setTag("activity", workerActivity);
    scope.setExtra("AckMsg", ackMsg);
    scope.setExtra("QueueMsg", queueMessage);

    Sentry.captureException(err);
  });
  cLogger.error("[ERRORED] (" + workerActivity + "): ", err);
}

function successMsg(message) {
  cLogger.mark("[x] Done (" + message + ")");
}
