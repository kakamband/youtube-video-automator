var Promise = require('bluebird');
var cLogger = require('color-log');
var shell = require('shelljs');
var dbController = require('../controller/db');
var Uploader = require('../uploader/uploader');

module.exports.recoverFromNothing = function() {
	return new Promise(function(resolve, reject) {

		// Go into the video data directory
		shell.cd("video_data/");

		// Content
		var content = new Map();
		var firstEntry = null;

		return shell.exec("ls", function(code, stdout, stderr) {
			if (code != 0) {
				return reject(stderr);
			}

			var directories = stdout.split("\n");
			directories.pop(); // Remove the extra empty directory
			return new Promise.mapSeries(directories, function(item, index, len) {
				cLogger.info("Looking at directory: " + item);

				return new Promise(function(res, rej) {
					shell.cd(item + "/");

					return dbController.getLatestClips(item)
					.then(function(clips) {
						if (firstEntry == null) {
							firstEntry = item;
						}

						content.set(item, clips);
						shell.cd("..");
						return res();
					})
					.catch(function(err) {
						return reject(err);
					});
				});
			})
			.then(function() {
				cLogger.mark("\nHave recovered the content. Now moving to a recovery directory.\n");
				return Uploader.recoverAllVideos(content, firstEntry, "../video_data_saved/");
			})
			.then(function() {
				return resolve();
			})
			.catch(function(err) {
				return reject(err);
			});
		})
	});
}
