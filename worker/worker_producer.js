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
			return getQueueMeta()
		})
		.then(function(queueInfo) {
			return makeSmartDownloadChoice(queueInfo, msgOptions);
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

function makeSmartDownloadChoice(queueInfo, msgOptions) {
	if (queueInfo.length > 0 && queueInfo[0].queueName == Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME) {
		cLogger.warn("The fallback queue is the smallest queue choice! This should be a sign that its time to increase the number of download workers.");
		// TODO: Log this to Sentry.
	}

	return new Promise(function(resolve, reject) {
		return isThereEmptyQueue(queueInfo)
		.then(function(emptyQ) {
			if (emptyQ >= 0) {
				cLogger.info("Found an empty queue. Adding to the first empty queue.");
				return postToFirstEmptyQ(queueInfo, msgOptions, emptyQ);
			} else {
				cLogger.warn("Didn't find a any empty queues. This is EXTREMELY DANGEROUS! This will result in customers not getting clips started at the correct time.");
				// TODO: Log this to Sentry

				return postToLowestDownloadQ(queueInfo, msgOptions);
			}
		})
		.then(function() {
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		})
	});
}

function postToLowestDownloadQ(queueInfo, msgOptions) {
	var validDownloadingChannels = [Attr.DOWNLOADING_AMQP_CHANNEL_NAME, Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME];
	return new Promise(function(resolve, reject) {
		var index = 0;

		function next() {
			if (validDownloadingChannels.indexOf(queueInfo[index].queueName) != -1) {
				return makeDownloadPost(queueInfo[index].queueName, msgOptions)
				.then(function() {
					return resolve();
				})
				.catch(function(err) {
					return reject(err);
				});
			} else {
				index++;
				return next();
			}
		}

		return next();
	});
}

function postToFirstEmptyQ(queueInfo, msgOptions, emptyQ) {
	return makeDownloadPost(queueInfo[emptyQ].queueName, msgOptions);
}

function makeDownloadPost(queueName, msgOptions) {
	return new Promise(function(resolve, reject) {

		if (workerChannel == null || workerChannel == undefined) {
			return reject("Can not publish to an undefined channel.");
		}

		var published = workerChannel.publish('', queueName, new Buffer("downloading_task"), msgOptions);
		if (published) {
			cLogger.info("Posted Download task!");
			return resolve();
		} else {
			return reject(new Error("The queue was full!"));
		}
	});
}

// returns if there are any empty queues
function isThereEmptyQueue(queueInfo) {
	return new Promise(function(resolve, reject) {
		for (var i = 0; i < queueInfo.length; i++) {
			var condition1 = (queueInfo[i].queueSize == 0 && queueInfo[i].consumerCount > 0);
			var condition2 = (queueInfo[i].consumerCount > 0 && (queueInfo[i].consumerCount - queueInfo[i].queueSize) > 0);
			if (condition1 || condition2) {
				return resolve(i);
			}
		}

		// TODO: Log this to Sentry.
		return resolve(-1);
	});
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

function getQueueMeta(){
	return new Promise(function(resolve, reject) {
		var eInfo, uInfo, dnInfo, fbInfo = null;

		return getMessagesAndConsumers(Attr.ENCODING_AMQP_CHANNEL_NAME)
		.then(function(encodinginfo) {
			eInfo = encodinginfo;
			return getMessagesAndConsumers(Attr.UPLOADING_AMQP_CHANNEL_NAME);
		})
		.then(function(uploadingInfo) {
			uInfo = uploadingInfo;
			return getMessagesAndConsumers(Attr.DOWNLOADING_AMQP_CHANNEL_NAME);
		})
		.then(function(downloadingInfo) {
			dnInfo = downloadingInfo;
			return getMessagesAndConsumers(Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME);
		})
		.then(function(fallbackInfo) {
			fbInfo = fallbackInfo;
		})
		.catch(function(err) {
			return reject(err);
		});
	});

	/*var mustBeInBack = [Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME];
	var downloadingQueues = [Attr.DOWNLOADING_AMQP_CHANNEL_NAME]; // We need to try to make these at the end before sorting.
	var watchingQueues = [Attr.ENCODING_AMQP_CHANNEL_NAME, Attr.UPLOADING_AMQP_CHANNEL_NAME];
	return new Promise(function(resolve, reject) {
		var queueSize = [];
		var downloadingQSize = [];
		var completeBackQSize = [];
		return shell.exec("rabbitmqctl list_queues name messages consumers", function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			var lines = stdout.split("\n");
			for (var i = 0; i < lines.length; i++) {
				var tmp = lines[i].split("\t");
				var queueName = tmp[0].trim();

				// If this is a queue we are watching for
				if (watchingQueues.indexOf(queueName) != -1) {
					var obj = {queueName: queueName};
					if (tmp.length >= 3) {
						var qs = parseInt(tmp[1]);
						var consumerCount = parseInt(tmp[2]);
						if (!isNaN(qs)) {
							obj.queueSize = qs;
							obj.consumerCount = consumerCount;
							queueSize.push(obj);
						}
					}
				} else if (downloadingQueues.indexOf(queueName) != -1) {
					var obj = {queueName: queueName};
					if (tmp.length >= 3) {
						var qs = parseInt(tmp[1]);
						var consumerCount = parseInt(tmp[2]);
						if (!isNaN(qs)) {
							obj.queueSize = qs;
							obj.consumerCount = consumerCount;
							downloadingQSize.push(obj);
						}
					}
				} else if (mustBeInBack.indexOf(queueName) != -1) {
					var obj = {queueName: queueName};
					if (tmp.length >= 3) {
						var qs = parseInt(tmp[1]);
						var consumerCount = parseInt(tmp[2]);
						if (!isNaN(qs)) {
							obj.queueSize = qs;
							obj.consumerCount = consumerCount;
							completeBackQSize.push(obj);
						}
					}
				}
			}

			var finalQueueInfo = queueSize.concat(downloadingQSize);
			finalQueueInfo = finalQueueInfo.concat(completeBackQSize);

			// Sanity check
			if (finalQueueInfo.length == 0) {
				var errMsg = "We found no open queues!";
				cLogger.error(errMsg);
				return reject(new Error(errMsg));
			}

			var initialMessagesSort = finalQueueInfo.sort(queueInfoSort);
			var secondaryConsumersSort = initialMessagesSort.sort(queueInfoSort2);

			return resolve(secondaryConsumersSort);
		});
	});*/
}

function queueInfoSort(a, b) {
	if (a.queueSize < b.queueSize)
		return -1;
	if (a.queueSize > b.queueSize)
		return 1;
	return 0;
}

function queueInfoSort2(a, b) {
	if (a.consumerCount > b.consumerCount)
		return -1;
	if (a.consumerCount < b.consumerCount)
		return 1;
	return 0;
}

// --------------------------------------------
// Helper functions above.
// --------------------------------------------