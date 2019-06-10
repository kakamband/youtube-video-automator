var Promise = require('bluebird');
var cLogger = require('color-log');
var amqp = require('amqplib/callback_api');
var Secrets = require('../config/secrets');
var Attr = require('../config/attributes');
var dbController = require('../controller/db');
var shell = require('shelljs');
var ErrorHelper = require('../errors/errors');
var DefinedErrors = require('../errors/defined_errors');

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// Redis Queue keys
const redisEncodingKey = "encoding_queue_msg_count";
const redisUploadingKey = "uploading_queue_msg_count";
const redisDownloadingKey = "downloading_queue_msg_count";
const redisFallbackKey = "fallback_queue_msg_count";


// initProducers
// Initializes the producer channels for Rabbitmq. These channels will be populated with a queue for tasks that the worker needs
// to accomplish. These channels NEED to be persistent, with no expiry.
// Returns a channel object.
module.exports.initProducers = function() {
	return new Promise(function(resolve, reject) {
		return createChannels()
		.then(function(ch) {
			global.workerChannel = ch;

			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// addTransferFileToS3Task
// Transfers a video file to the S3 bucket, then deletes the file, and updates the db.
module.exports.addTransferFileToS3Task = function(userID, twitchLink, downloadID) {
	return new Promise(function(resolve, reject) {
		var msgOptions = {
			persistent: true,
			priority: 10,
			mandatory: true,
			timestamp: (new Date).getTime(),
			correlationId: userID,
			contentEncoding: twitchLink,
			messageId: (downloadID + "")
		};

		// Returns an unactive queue that can be consumed right away
		// Also sets the queue to now be working
		return getQueueMeta()
		.then(function(queueChoice) {
			return makeTransferToS3Post(queueChoice, msgOptions)
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// addDownloadingTask
// Adds a downloading task to an unoccupied worker, or creates one if none exist (TODO).
module.exports.addDownloadingTask = function(userID, twitchLink, gameName) {
	return new Promise(function(resolve, reject) {
		var msgOptions = {
			persistent: true,
			priority: 1,
			mandatory: true,
			timestamp: (new Date).getTime(),
			correlationId: userID,
			contentType: gameName,
			contentEncoding: twitchLink
		};

		var createdAtDateTime = new Date();
		var downloadObj = {
			game: gameName,
			user_id: userID,
			state: "preparing",
			twitch_link: twitchLink,
			created_at: createdAtDateTime,
			updated_at: createdAtDateTime
		};
		var downloadObjID = null;

		return dbController.addDownload(downloadObj)
		.then(function(downloadID) {
			downloadObjID = downloadID;
			msgOptions.messageId = downloadObjID + "";
			return dbController.setDownloadInitialOrder(userID, downloadObjID, gameName);
		})
		.then(function() {
			return getQueueMeta();
		})
		.then(function(queueChoice) {
			return makeDownloadPost(queueChoice, msgOptions);
		})
		.then(function() {
			return resolve(downloadObjID);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// startPermDeleteCycle
// Starts a permanent delete cycle
module.exports.startPermDeleteCycle = function() {
	return new Promise(function(resolve, reject) {
		var msgOptions = {
			persistent: true,
			priority: 10,
			mandatory: true,
			timestamp: (new Date).getTime()
		};

		return workerStartingWork("fallback")
		.then(function() {
			return makePermDeletePost(Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME, msgOptions);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// startProcessingCycle
// Checks to see if any videos can be processed, and if they can it queues them up.
module.exports.startProcessingCycle = function() {
	return new Promise(function(resolve, reject) {
		var msgOptions = {
			persistent: true,
			priority: 5,
			mandatory: true,
			timestamp: (new Date).getTime()
		};

		return getQueueMeta()
		.then(function(queueChoice) {
			return makeProcessingCyclePost(queueChoice, msgOptions)
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// startIntrosOutrosDeleteCycle
// Checks to see if there are any failed intro/outro uploads that we can delete
module.exports.startIntrosOutrosDeleteCycle = function() {
	return new Promise(function(resolve, reject) {
		var msgOptions = {
			persistent: true,
			priority: 10,
			mandatory: true,
			timestamp: (new Date).getTime()
		};

		return workerStartingWork("fallback")
		.then(function() {
			return makeIntroOutroDeletePost(Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME, msgOptions);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// queueVideoToProcess
// Queues a video to begin being processed.
module.exports.queueVideoToProcess = function(userID, pmsID, downloadID, toCombineIDs, intro, outro) {
	return new Promise(function(resolve, reject) {
		var msgOptions = {
			persistent: true,
			priority: 4,
			mandatory: true,
			timestamp: (new Date).getTime(),
			correlationId: userID,
			contentType: pmsID,
			contentEncoding: JSON.stringify(toCombineIDs),
			messageId: downloadID + "",
			headers: {
				intro: intro,
				outro: outro
			}
		};

		return workerStartingWork("encoder")
		.then(function() {
			return makeProcessingPost(Attr.ENCODING_AMQP_CHANNEL_NAME, msgOptions);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// queueVideoToUpload
// Queues a video to begin being uploaded.
module.exports.queueVideoToUpload = function(userID, pmsID, downloadID, finalFileLocation, toCombineIDs) {
	return new Promise(function(resolve, reject) {
		var msgOptions = {
			persistent: true,
			priority: 4,
			mandatory: true,
			timestamp: (new Date).getTime(),
			correlationId: userID,
			contentType: pmsID,
			contentEncoding: finalFileLocation,
			messageId: downloadID + "",
			type: JSON.stringify(toCombineIDs)
		};

		return workerStartingWork("uploader")
		.then(function() {
			return makeUploadingPost(Attr.UPLOADING_AMQP_CHANNEL_NAME, msgOptions);
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// --------------------------------------------
// Exported compartmentalized functions above.
// --------------------------------------------


// --------------------------------------------
// Depracated functions below.
// --------------------------------------------

// DEPRECATED
// addEncodingTask
// Adds an encoding task to the back of the encoding queue.
module.exports.addEncodingTask = function(userID, quality) {
	var validQualities = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"];

	return new Promise(function(resolve, reject) {
		// Make sure the encoding quality is a valid one, and if it isn't just set the quality to the default medium.
		if (validQualities.indexOf(quality) == -1) {
			quality = "medium";
		}

		var published = encodingChannel.publish('', Attr.ENCODING_AMQP_CHANNEL_NAME, new Buffer("encoding_task"), {
			persistent: true,
			priority: 1,
			mandatory: true,
			timestamp: (new Date).getTime(),
			type: quality,
			correlationId: userID
		});
		if (published) {
			cLogger.info("Published encoding task.");
			return resolve();
		} else {
			return reject(new Error("Not enough room in encoding queue."));
		}
	});
}

// DEPRECATED
// addUploadingTask
// Adds an uploading task to the back of the uploading queue.
module.exports.addUploadingTask = function(userID) {
	return new Promise(function(resolve, reject) {
		var published = ch.publish('', Attr.UPLOADING_AMQP_CHANNEL_NAME, new Buffer("uploading_task"), {
			persistent: true,
			priority: 1,
			mandatory: true,
			timestamp: (new Date).getTime(),
			correlationId: userID
		});
		if (published) {
			cLogger.info("Published uploading task.");
			return resolve();
		} else {
			return reject(new Error("Not enough room in encoding queue."));
		}
	});
}

// --------------------------------------------
// Helper functions below.
// --------------------------------------------

function createChannels() {
	return createChannel([Attr.ENCODING_AMQP_CHANNEL_NAME, Attr.UPLOADING_AMQP_CHANNEL_NAME, Attr.DOWNLOADING_AMQP_CHANNEL_NAME, Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME]);
}

function createChannel(queueNames) {
	return new Promise(function(resolve, reject) {
		amqp.connect(Attr.RABBITMQ_CONNECTION_STR, function(err, conn) {
		  conn.createChannel(function(err, ch) {
		    for (var i = 0; i < queueNames.length; i++) {
		    	ch.assertQueue(queueNames[i], {durable: true, maxPriority: 10});
		    }
		    return resolve(ch);
		  });
		});
	});
}

function makePost(queueName, msgOptions, taskName) {
	return new Promise(function(resolve, reject) {
		if (workerChannel == null || workerChannel == undefined) {
			return reject("Can not publish to an undefined channel.");
		}

		var published = workerChannel.publish('', queueName, new Buffer(taskName), msgOptions);
		if (published) {
			return resolve();
		} else {
			return reject(new Error("The queue was full!"));
		}
	});
}

function makeTransferIntroOutroToS3Post(queueName, msgOptions) {
	return makePost(queueName, msgOptions, "transfer_intro_outro_task");
}

function makeTransferToS3Post(queueName, msgOptions) {
	return makePost(queueName, msgOptions, "transfer_video_task");
}

function makeDownloadPost(queueName, msgOptions) {
	return makePost(queueName, msgOptions, "downloading_task");
}

function makeIntroOutroDeletePost(queueName, msgOptions) {
	return makePost(queueName, msgOptions, "intro_outro_delete_task");
}

function makePermDeletePost(queueName, msgOptions) {
	return makePost(queueName, msgOptions, "permanent_delete_task");
}

function makeProcessingCyclePost(queueName, msgOptions) {
	return makePost(queueName, msgOptions, "processing_cycle_start");
}

function makeProcessingPost(queueName, msgOptions) {
	return makePost(queueName, msgOptions, "processing_start");
}

function makeUploadingPost(queueName, msgOptions) {
	return makePost(queueName, msgOptions, "uploading_start");
}

function getMessagesAndConsumers(queueName) {
	return new Promise(function(resolve, reject) {
		amqp.connect(Attr.RABBITMQ_CONNECTION_STR, function(err, conn) {
		  conn.createChannel(function(err, ch) {
		    	ch.assertQueue(queueName, {durable: true, maxPriority: 10}, function(err, ok) {
			      console.log(ok);
			      return resolve([ok.messageCount, ok.consumerCount]);
			    });
	    	});
		});
	});
}

function checkIfInRedis(key) {
    return new Promise(function(resolve, reject) {
        return redis.get(key, function(err, reply) {
            if (!err && reply != null) {
                return resolve(reply.toString());
            } else {
                return resolve(undefined);
            }
        });
    });
}

function getQueueMessages(key) {
	return new Promise(function(resolve, reject) {
		return checkIfInRedis(key)
		.then(function(value) {
			if (value == undefined) {
				return resolve(0);
			} else {
				return resolve(parseInt(value));
			}
		});
	});
}

function _addWorkerCurrentlyWorking(workerType) {
	return new Promise(function(resolve, reject) {
		return dbController.workerBeingUtilized(workerType)
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function workerStartingWork(workerType) {
	return new Promise(function(resolve, reject) {
		switch (workerType) {
			case "downloader":
			case "encoder":
			case "uploader":
			case "fallback":
				return _addWorkerCurrentlyWorking(workerType)
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(err);
				});
			default:
				ErrorHelper.emitSimpleError(DefinedErrors.invalidWorkerType(workerType));
				return resolve();
		}
	});
}

function transactionIncMsgCount(key) {
	return new Promise(function(resolve, reject) {
		var multi = redis.multi();
		multi.incr(key);
		multi.exec(function (err, replies) {
		    console.log(replies);
		    console.log(err);
		    return resolve();
		});
	});
}

// Returns [currently_running_worker_count, currently_active_workers]
function getQueueMessagesV2(workerType) {
	return new Promise(function(resolve, reject) {
		switch (workerType) {
			case "downloader":
			case "encoder":
			case "uploader":
			case "fallback":
				return dbController.getWorkerInformation(workerType)
				.then(function(workerInfo) {
					return resolve(workerInfo);
				})
				.catch(function(err) {
					return reject(err);
				});
			default:
				ErrorHelper.emitSimpleError(DefinedErrors.invalidWorkerType(workerType));
				return resolve([0, 0]); // Cant use this worker obviously
		}
	});
}

function getQueueMeta(){
	return new Promise(function(resolve, reject) {
		return getQueueMessagesV2("encoder")
		.then(function(queueInfo) {
			let runningWorkers = queueInfo[0];
			let activeWorkers = queueInfo[1];

			// Check if there are any empty workers
			var hasEmptyConsumer = (runningWorkers - activeWorkers > 0);
			if (hasEmptyConsumer) {
				return workerStartingWork("encoder")
				.then(function() {
					return resolve(Attr.ENCODING_AMQP_CHANNEL_NAME);
				});
			} else {
				return getQueueMessagesV2("uploader")
			}
		})
		.then(function(queueInfo1) {
			let runningWorkers = queueInfo1[0];
			let activeWorkers = queueInfo1[1];

			// Check if there are any empty workers
			var hasEmptyConsumer = (runningWorkers - activeWorkers > 0);
			if (hasEmptyConsumer) {
				return workerStartingWork("uploader")
				.then(function() {
					return resolve(Attr.UPLOADING_AMQP_CHANNEL_NAME);
				});
			} else {
				return getQueueMessagesV2("downloader")
			}
		})
		.then(function(queueInfo2) {
			let runningWorkers = queueInfo2[0];
			let activeWorkers = queueInfo2[1];

			// Check if there are any empty workers
			var hasEmptyConsumer = (runningWorkers - activeWorkers > 0);
			if (hasEmptyConsumer) {
				return workerStartingWork("downloader")
				.then(function() {
					return resolve(Attr.DOWNLOADING_AMQP_CHANNEL_NAME);
				});
			} else {
				return getQueueMessagesV2("fallback")
			}
		})
		.then(function(queueInfo3) {
			let runningWorkers = queueInfo3[0];
			let activeWorkers = queueInfo3[1];

			// Check if there are any empty workers
			var hasEmptyConsumer = (runningWorkers - activeWorkers > 0);
			if (hasEmptyConsumer) {
				return workerStartingWork("fallback")
				.then(function() {
					return resolve(Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME);
				});
			} else {
				// This is extremely dangerous
				// Log to Sentry
				// Send an email to admin
				// Send an SMS to admin
				cLogger.info("No consumers were available!! This is very dangerous, trying to manually start up a new worker.");
				ErrorHelper.emitSimpleError(new Error("Safe Error: Created a new fallback consumer to handle the user load."));

				var newConsumer = shell.exec(Attr.FINAL_FALLBACK_NO_CONSUMERS_FOR_DWNLOAD, {async: true});
				return workerStartingWork("fallback")
				.then(function() {
					return resolve(Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME);
				});
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// --------------------------------------------
// Helper functions above.
// --------------------------------------------