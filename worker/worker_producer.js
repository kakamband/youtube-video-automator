var Promise = require('bluebird');
var cLogger = require('color-log');
var amqp = require('amqplib/callback_api');
var Secrets = require('../config/secrets');
var Attr = require('../config/attributes');
var dbController = require('../controller/db');
var shell = require('shelljs');

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

		return transactionIncMsgCount(redisUploadingKey)
		.then(function() {
			return makeTransferToS3Post(msgOptions)
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		})
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

		var downloadObj = {
			game: gameName,
			user_id: userID,
			twitch_link: twitchLink,
			created_at: new Date(),
			updated_at: new Date()
		};
		var downloadObjID = null;

		return dbController.addDownload(downloadObj)
		.then(function(downloadID) {
			downloadObjID = downloadID;
			msgOptions.messageId = downloadObjID + "";
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

// --------------------------------------------
// Exported compartmentalized functions above.
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
			cLogger.info("Posted " + taskName + " task!");
			return resolve();
		} else {
			return reject(new Error("The queue was full!"));
		}
	});
}

function makeTransferToS3Post(msgOptions) {
	return makePost(Attr.UPLOADING_AMQP_CHANNEL_NAME, msgOptions, "transfer_video_task");
}

function makeDownloadPost(queueName, msgOptions) {
	return makePost(queueName, msgOptions, "downloading_task");
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


function getQueueMeta(){

	return new Promise(function(resolve, reject) {
		return getMessagesAndConsumers(Attr.ENCODING_AMQP_CHANNEL_NAME)
		.then(function(encodinginfo) {
			return getQueueMessages(redisEncodingKey)
			.then(function(messageCount) {
				let consumerCount = encodinginfo[1];

				// Check if there are any empty workers
				var hasEmptyConsumer = (consumerCount - messageCount > 0);
				if (hasEmptyConsumer) {
					return transactionIncMsgCount(redisEncodingKey)
					.then(function() {
						return resolve(Attr.ENCODING_AMQP_CHANNEL_NAME);
					});
				} else {
					return getMessagesAndConsumers(Attr.UPLOADING_AMQP_CHANNEL_NAME);
				}
			});
		})
		.then(function(uploadingInfo) {
			return getQueueMessages(redisUploadingKey)
			.then(function(messageCount) {
				let consumerCount = uploadingInfo[1];

				// Check if there are any empty workers
				var hasEmptyConsumer = (consumerCount - messageCount > 0);
				if (hasEmptyConsumer) {
					return transactionIncMsgCount(redisUploadingKey)
					.then(function() {
						return resolve(Attr.UPLOADING_AMQP_CHANNEL_NAME);
					});
				} else {
					return getMessagesAndConsumers(Attr.DOWNLOADING_AMQP_CHANNEL_NAME);
				}
			});
		})
		.then(function(downloadingInfo) {
			return getQueueMessages(redisDownloadingKey)
			.then(function(messageCount) {
				let consumerCount = downloadingInfo[1];

				// Check if there are any empty workers
				var hasEmptyConsumer = (consumerCount - messageCount > 0);
				if (hasEmptyConsumer) {
					return transactionIncMsgCount(redisDownloadingKey)
					.then(function() {
						return resolve(Attr.DOWNLOADING_AMQP_CHANNEL_NAME);
					});
				} else {
					return getMessagesAndConsumers(Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME);
				}
			});
		})
		.then(function(fallbackInfo) {
			return getQueueMessages(redisFallbackKey)
			.then(function(messageCount) {
				let consumerCount = fallbackInfo[1];

				// Check if there are any empty workers
				var hasEmptyConsumer = (consumerCount - messageCount > 0);
				if (hasEmptyConsumer) {
					return transactionIncMsgCount(redisFallbackKey)
					.then(function() {
						return resolve(Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME);
					});
				} else {				
					// This is extremely dangerous
					// Log to Sentry
					// Send an email to admin
					// Send an SMS to admin
					cLogger.info("No consumers were available!! This is very dangerous, trying to manually start up a new worker.");

					var newConsumer = shell.exec(Attr.FINAL_FALLBACK_NO_CONSUMERS_FOR_DWNLOAD, {async: true});
					return transactionIncMsgCount(redisFallbackKey)
					.then(function() {
						return resolve(Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME);
					});
				}
			});
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// --------------------------------------------
// Helper functions above.
// --------------------------------------------