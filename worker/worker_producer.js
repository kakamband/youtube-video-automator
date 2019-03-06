var Promise = require('bluebird');
var cLogger = require('color-log');
var amqp = require('amqplib/callback_api');
var Secrets = require('../config/secrets');
var Attr = require('../config/attributes');
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

		return getQueueMeta()
		.then(function(queueInfo) {
			return makeSmartDownloadChoice(queueInfo, msgOptions);
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
// Helper functions below.
// --------------------------------------------

function createChannels() {
	return createChannel([Attr.ENCODING_AMQP_CHANNEL_NAME, Attr.UPLOADING_AMQP_CHANNEL_NAME, Attr.DOWNLOADING_AMQP_CHANNEL_NAME, Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME]);
}

function createChannel(queueNames) {
	return new Promise(function(resolve, reject) {
		amqp.connect(Secrets.RABBITMQ_SERVER, function(err, conn) {
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
			if (emptyQ) {
				cLogger.info("Found an empty queue. Adding to the first empty queue.");
				return postToFirstEmptyQ(queueInfo, msgOptions);
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

function postToFirstEmptyQ(queueInfo, msgOptions) {
	return new Promise(function(resolve, reject) {
		var index = 0;

		function next() {
			// This should never be reached
			if (queueInfo.length <= index) {
				return reject(new Error("Trying to post to an empty queue, however didnt find any? This is very unlikely."));
			}

			if (queueInfo[index].queueSize == 0) {
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
			if (queueInfo[i].queueSize == 0) {
				return resolve(true);
			}
		}

		// TODO: Log this to Sentry.
		return resolve(false);
	});
}

function getQueueMeta(){
	var mustBeInBack = [Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME];
	var downloadingQueues = [Attr.DOWNLOADING_AMQP_CHANNEL_NAME]; // We need to try to make these at the end before sorting.
	var watchingQueues = [Attr.ENCODING_AMQP_CHANNEL_NAME, Attr.UPLOADING_AMQP_CHANNEL_NAME];
	return new Promise(function(resolve, reject) {
		var queueSize = [];
		var downloadingQSize = [];
		var completeBackQSize = [];
		return shell.exec("rabbitmqctl list_queues", function(code, stdout, stderr) {
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
					if (tmp.length >= 2) {
						var qs = parseInt(tmp[1]);
						if (!isNaN(qs)) {
							obj.queueSize = qs;
							queueSize.push(obj);
						}
					}
				} else if (downloadingQueues.indexOf(queueName) != -1) {
					var obj = {queueName: queueName};
					if (tmp.length >= 2) {
						var qs = parseInt(tmp[1]);
						if (!isNaN(qs)) {
							obj.queueSize = qs;
							downloadingQSize.push(obj);
						}
					}
				} else if (mustBeInBack.indexOf(queueName) != -1) {
					var obj = {queueName: queueName};
					if (tmp.length >= 2) {
						var qs = parseInt(tmp[1]);
						if (!isNaN(qs)) {
							obj.queueSize = qs;
							completeBackQSize.push(obj);
						}
					}
				}
			}

			var finalQueueInfo = queueSize.concat(downloadingQSize);
			finalQueueInfo = finalQueueInfo.concat(completeBackQSize);
			return resolve(finalQueueInfo.sort(queueInfoSort));
		});
	});
}

function queueInfoSort(a, b) {
	if (a.queueSize < b.queueSize)
		return -1;
	if (a.queueSize > b.queueSize)
		return 1;
	return 0;
}

// --------------------------------------------
// Helper functions above.
// --------------------------------------------