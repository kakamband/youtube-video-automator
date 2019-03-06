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
	var encChannel = null;
	var uplChannel = null;
	var downChannel = null;
	return new Promise(function(resolve, reject) {
		return createEncodingChannel()
		.then(function(encodingChannel) {
			encChannel = encodingChannel;
			return createUploadingChannel();
		})
		.then(function(uploadingChannel) {
			uplChannel = uploadingChannel;
			return createDownloadingChannel();
		})
		.then(function(dlChannel) {
			downChannel = dlChannel;
			return resolve(createChannelObject(encChannel, uplChannel, dlChannel));
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// addEncodingTask
// Adds an encoding task to the back of the encoding queue.
module.exports.addEncodingTask = function(channelObj, userID, quality) {
	var validQualities = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"];

	return new Promise(function(resolve, reject) {
		var initErr = validateChannelObj(channelObj, "encoding");
		if (initErr != null) {
			return reject(initErr);
		}

		// Make sure the encoding quality is a valid one, and if it isn't just set the quality to the default medium.
		if (validQualities.indexOf(quality) == -1) {
			quality = "medium";
		}

		ch.publish('', Attr.ENCODING_AMQP_CHANNEL_NAME, new Buffer("encoding_task"), {
			persistent: true,
			priority: 1,
			mandatory: true,
			timestamp: (new Date).getTime(),
			type: quality,
			correlationId: userID
		})
		.then(function(results) {
			cLogger.info("Succesfully added an encoding task! Response: ", results);
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// addUploadingTask
// Adds an uploading task to the back of the uploading queue.
module.exports.addUploadingTask = function(channelObj, userID) {
	return new Promise(function(resolve, reject) {
		var initErr = validateChannelObj(channelObj, "uploading");
		if (initErr != null) {
			return reject(initErr);
		}

		ch.publish('', Attr.UPLOADING_AMQP_CHANNEL_NAME, new Buffer("uploading_task"), {
			persistent: true,
			priority: 1,
			mandatory: true,
			timestamp: (new Date).getTime(),
			correlationId: userID
		})
		.then(function(results) {
			cLogger.info("Succesfully added an uploading task! Response: ", results);
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

// addDownloadingTask
// Adds a downloading task to an unoccupied worker, or creates one if none exist (TODO).
module.exports.addDownloadingTask = function(channelObj, userID) {
	return new Promise(function(resolve, reject) {
		var initErr = validateChannelObj(channelObj, "downloading");
		if (initErr != null) {
			return reject(initErr);
		}

		var msgOptions = {
			persistent: true,
			priority: 1,
			mandatory: true,
			timestamp: (new Date).getTime(),
			correlationId: userID
		};

		return getQueueMeta()
		.then(function(queueInfo) {
			cLogger.info("The queueInfo is: ", queueInfo);
		})
		.catch(function(err) {
			return reject(err);
		});
		/*ch.publish('', Attr.UPLOADING_AMQP_CHANNEL_NAME, new Buffer("downloading_task"), )
		.then(function(results) {
			cLogger.info("Succesfully added an uploading task! Response: ", results);
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		});*/
	});
}

// --------------------------------------------
// Exported compartmentalized functions above.
// --------------------------------------------
// Helper functions below.
// --------------------------------------------

function validateChannelObj(channelObj, taskName) {
	if (channelObj == null) {
		return new Error("No channel object found! No where to send this message!");
	} else if (taskName == "encoding" && (channelObj.encoding == null || !channelObj.encoding)) {
		return new Error("Could not find a channel for encoding, your channel object doesn't seem to be created correctly.");
	} else if (taskName == "uploading" && (channelObj.uploading == null || !channelObj.uploading)) {
		return new Error("Could not find a channel for uploading, your channel object doesn't seem to be created correctly.");
	} else if (taskName == "downloading" && (channelObj.downloading == null || !channelObj.downloading)) {
		return new Error("Could not find a channel for downloading, your channel object doesn't seem to be created correctly.");
	} else {
		return null;
	}
}

function createChannelObject(enc, upl, dl) {
	return {
		encoding: enc,
		uploading: upl,
		downloading: dl
	}
}

function createEncodingChannel() {
	return createChannel(Attr.ENCODING_AMQP_CHANNEL_NAME);
}

function createUploadingChannel() {
	return createChannel(Attr.UPLOADING_AMQP_CHANNEL_NAME);
}

function createDownloadingChannel() {
	return createChannel(Attr.DOWNLOADING_AMQP_CHANNEL_NAME);
}

function createChannel(channelName) {
	return new Promise(function(resolve, reject) {
		amqp.connect(Secrets.RABBITMQ_SERVER, function(err, conn) {
		  conn.createChannel(function(err, ch) {
		    var q = channelName;

		    ch.assertQueue(q, {durable: true, maxPriority: 10});
		    return resolve(ch);
		  });
		});
	});
}

function getQueueMeta(){
	var watchingQueues = [Attr.ENCODING_AMQP_CHANNEL_NAME, Attr.UPLOADING_AMQP_CHANNEL_NAME, Attr.DOWNLOADING_AMQP_CHANNEL_NAME];
	return new Promise(function(resolve, reject) {
		var queueSize = [];
		return shell.exec("rabbitmqctl list_queues", function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			var lines = stdout.split("\n");
			for (var i = 0; i < lines.length; i++) {
				var tmp = lines[i].split("\s");
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
				}
			}

			return resolve(queueSize);
		});
	});
}

// --------------------------------------------
// Helper functions above.
// --------------------------------------------