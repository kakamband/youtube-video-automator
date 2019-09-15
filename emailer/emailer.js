var Promise = require('bluebird');
var cLogger = require('color-log');
var ErrorHelper = require('../errors/errors');
var Errors = require('../errors/defined_errors');
var Attr = require('../config/attributes');
var shell = require('shelljs');
var Secrets = require('../config/secrets');
var dbController = require('../controller/db');
var ses = require('node-ses');
var xmlParser = require('fast-xml-parser');
var bodyBuilder = require('./body_builder');
const uniqueString = require('unique-string');

var sesClient;
const autoTuberHelpEmail = 'AutoTuber <autotuber.help@gmail.com>';
const welcomeEmailID = "welcome_email";

module.exports.unsubscribeFromEmail = function(userID, token) {
	return new Promise(function(resolve, reject) {
		return dbController.getUserEmailList(userID)
		.then(function(emailList) {
			var errorCond1 = (emailList == undefined);
			var errorCond2 = (emailList != undefined && emailList.emails_enabled == false);
			var errorCond3 = (emailList != undefined && emailList.email_unsubscribe_token != token);

			if (errorCond1 || errorCond2 || errorCond3) {
				return reject(Errors.userTryingToUnsubscribeIllegally());
			} else {
				return dbController.updateUserEmailList(userID, token, false)
				.then(function() {
					return resolve(true);
				})
				.catch(function(err) {
					return reject(err);
				})
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

module.exports.initClient = function() {
	var client = ses.createClient({
		key: Secrets.IAM_ACCESS_KEY,
		secret: Secrets.IAM_SECRET_ACCESS_KEY 
	});
	sesClient = client;
};

module.exports.sendWelcomeEmail = function(userID, pmsID, toEmail, safe) {
	var reqBody = {
		toEmail: toEmail,
	}

	if (safe) {
		return _sendEmail(userID, pmsID, welcomeEmailID, reqBody)
		.then(function() {
			return Promise.resolve();
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigureWarning("emailer.sendWelcomeEmail.safe", {
				user_id: userID,
				pmsID: pmsID,
				toEmail: toEmail,
			});
			ErrorHelper.emitSimpleError(err);
			cLogger.info("On safe route, not erroring out.");
			return Promise.resolve();
		});
	} else {
		return _sendEmail(userID, pmsID, welcomeEmailID, reqBody);
	}
}

function _sendEmail(userID, pmsID, emailID, reqBody) {
	var req, dataID;

	return new Promise(function(resolve, reject) {
		return _userAllowingEmails(userID)
		.then(function(allowingEmails) {
			if (!allowingEmails) {
				ErrorHelper.scopeConfigureWarning("emailer._sendEmail", {
					user_id: userID,
					pmsID: pmsID,
					emailID: emailID,
				});
				ErrorHelper.emitSimpleError(Errors.userNotAllowingEmails());
				return resolve();
			} else {
				return _buildEmail(emailID, reqBody);
			}
		})
		.then(function(build) {
			dataID = build[1]

			return _addUnsubscribeLink(userID, build[0]);
		})
		.then(function(newReq) {
			req = newReq

			return _postEmail(emailID, req);
		})
		.then(function(data) {
			var ccVal = null;
			var bccVal = null;
			if (req.cc) {
				ccVal = JSON.stringify(req.cc)
			}
			if (req.bcc) {
				bccVal = JSON.stringify(req.bcc);
			}
			var now = new Date();

			return dbController.insertEmail({
				user_id: userID,
				pms_user_id: pmsID,
				email_id: emailID,
				data_id: dataID,
				to: JSON.stringify(req.to),
				from: JSON.stringify(req.from),
				cc: ccVal,
				bcc: bccVal,
				message_id: data[0],
				request_id: data[1],
				updated_at: now,
				created_at: now,
			});
		})
		.then(function() {
			cLogger.info("Success sending email (" + emailID + ")");
			return resolve();
		})
		.catch(function(err) {
			return reject(err);
		})
	});
}

function _addUnsubscribeLink(userID, request) {
	return new Promise(function(resolve, reject) {
		messageTxt = request.message
		altTxt = request.altText

		return _buildEmailBodiesWithUnsubscribeLinks(userID, messageTxt, altTxt)
		.then(function(newBodies) {
			request.message = newBodies[0];
			request.altText = newBodies[1];

			return resolve(request);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _postEmail(emailID, req) {
	return new Promise(function(resolve, reject) {
		return sesClient.sendEmail(req, function(err, data, res) {
			if (err) {
				return reject(err);
			}

			var jsonObj = xmlParser.parse(data);
			return resolve([jsonObj.SendEmailResponse.SendEmailResult.MessageId, jsonObj.SendEmailResponse.ResponseMetadata.RequestId]);
		});
	});
}

function _buildEmail(emailID, reqBody) {
	switch (emailID) {
		case welcomeEmailID:
			return buildWelcomeEmail(reqBody);
	}

	return Promise.reject(Errors.invalidEmailID(emailID));
}

function _buildEmailBodiesWithUnsubscribeLinks(userID, messageTxt, altText) {
	return new Promise(function(resolve, reject) {
		return dbController.getUserEmailList(userID)
		.then(function(emailList) {
			if (emailList == undefined) {
                var newToken = uniqueString();

				return dbController.newEmailListEmailsAllowed(userID, newToken)
				.then(function() {
					return _buildEmailBodiesWithUnsubLinksHelper(userID, newToken, messageTxt, altText)
					.then(function(newBodies) {
						return resolve(newBodies);
					})
					.catch(function(err) {
						return reject(err);
					});
				})
				.catch(function(err) {
					return reject(err);
				});
			} else {
				if (emailList.emails_enabled == false) {
					return reject(Errors.userNotAllowingEmails());
				} else {
					return _buildEmailBodiesWithUnsubLinksHelper(userID, emailList.email_unsubscribe_token, messageTxt, altText)
					.then(function(newBodies) {
						return resolve(newBodies);
					})
					.catch(function(err) {
						return reject(err);
					});
				}
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _buildEmailBodiesWithUnsubLinksHelper(userID, token, messageTxt, altText) {
	var newMessageTxt;
	var newAltTxt;

	return new Promise(function(resolve, reject) {
		return _buildMessageTxtWithUnsubscribe(userID, token, messageTxt)
		.then(function(newTxt) {
			newMessageTxt = newTxt;

			return _buildAltMessageTxtWithUnsubscribe(userID, token, altText);
		})
		.then(function(newTxt2) {
			newAltTxt = newTxt2;

			return resolve([newMessageTxt, newAltTxt]);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function _buildMessageTxtWithUnsubscribe(userID, token, messageTxt) {
	return new Promise(function(resolve, reject) {
		var re = /href=\".+\">Unsubscribe/gi;
		var newHtml = "href=\"" + _buildUnsubscribeLink(userID, token) + "\">Unsubscribe";
		return resolve(messageTxt.replace(re, newHtml))
	});
}

function _buildAltMessageTxtWithUnsubscribe(userID, token, altText) {
	return new Promise(function(resolve, reject) {
		var re = /Unsubscribe https:\/\/.+$/gi;
		var newTxt = "Unsubscribe " + _buildUnsubscribeLink(userID, token);
		return resolve(messageTxt.replace(re, newTxt))
	});
}

function _buildUnsubscribeLink(userID, token) {
	const linkPrefix = "https://twitchautomator.com/unsubscribe?";

	return linkPrefix + "user_id=" + userID + "&unsubscribe_token=" + token;
}

function _userAllowingEmails(userID) {
	return new Promise(function(resolve, reject) {
		return dbController.getUserEmailList(userID)
		.then(function(emailList) {
			if (emailList == undefined) {
				return resolve(true);
			} else {
				if (emailList.emails_enabled == false) {
					return resolve(false);
				} else {
					return resolve(true);
				}
			}
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function buildWelcomeEmail(reqBody) {
	const welcomeSubject = "How AutoTuber works";
	var welcomeDataID = bodyBuilder.getMostRecondWelcomeID();

	return new Promise(function(resolve, reject) {
		if (!reqBody.toEmail) {
			return reject(Errors.noToEmailPassed());
		}

		return bodyBuilder.dataIDToBody(welcomeDataID)
		.then(function(emailBodies) {
			return resolve([{
				to: reqBody.toEmail,
				from: autoTuberHelpEmail,
				subject: welcomeSubject,
				message: emailBodies[0],
				altText: emailBodies[1],
			}, welcomeDataID]);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}
