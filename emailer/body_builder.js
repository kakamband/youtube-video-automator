var Promise = require('bluebird');
var cLogger = require('color-log');
var ErrorHelper = require('../errors/errors');
var Errors = require('../errors/defined_errors');
const fs = require('fs');

// All the data ID's
const welcomeDataIDV1 = "welcome_email_v1";

// The map of data to file name
const emailTemplatesPrefix = "emailer/email_templates/";
var dataIDToFile = new Map([
	[welcomeDataIDV1, emailTemplatesPrefix + "welcome_email.html"],
]);
var dataIDToAltFile = new Map([
	[welcomeDataIDV1, emailTemplatesPrefix + "welcome_email_plain_text.txt"],
]);

module.exports.dataIDToBody = function(dataID) {
	return new Promise(function(resolve, reject) {
		var filePath = dataIDToFile.get(dataID);
		var altFilePath = dataIDToAltFile.get(dataID);
		if (filePath == undefined) {
			return reject(Errors.dataIDHasNoFileMapping(dataID));
		}

		// Get the html email data
		var text = fs.readFileSync(ORIGIN_PATH + filePath, 'utf8');

		// Get the Alt text if it exists, if not, no worries
		var altText = "No Alt Text Set.";
		if (altFilePath != undefined) {
			altText = fs.readFileSync(ORIGIN_PATH + altFilePath, 'utf8');
		}

		return resolve([text, altText]);
	});
}

module.exports.getMostRecondWelcomeID = function() {
	return welcomeDataIDV1;
}
