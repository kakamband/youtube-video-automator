var Promise = require('bluebird');
var cLogger = require('color-log');
var dbController = require('../controller/db');

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// createUser
// Handles the create user endpoint, this endpoint will either create a new user or just update their contents.
module.exports.createUser = function(username, ID, email, password, payments, subs) {
    return new Promise(function(resolve, reject) {
    	cLogger.info("Creating a user.");
    	return dbController.createOrUpdateUser(username, ID, email, password, payments, subs)
    	.then(function() {
    		return resolve();
    	})
    	.catch(function(err) {
    		return reject(err);
    	});
    });
};

// hasUserToken
// Handles the create user endpoint, this endpoint will either create a new user or just update their contents.
module.exports.hasUserToken = function(username, ID, email, password) {
    return new Promise(function(resolve, reject) {
    	return validateUserAndGetID(username, ID, email, password)
    	.then(function(id) {
    		return dbController.hasUserToken(id);
    	})
    	.then(function(userToken) {
    		if (userToken == undefined) {
    			return resolve(false);
    		}
    		return resolve(true);
    	})
    	.catch(function(err) {
    		return reject(err);
    	});
    });
};

// --------------------------------------------
// Exported compartmentalized functions above.
// --------------------------------------------
// Helper functions below.
// --------------------------------------------

function validateUserAndGetID(username, ID, email, password) {
	return new Promise(function(resolve, reject) {

		// At some point we should be checking redis here instead. This will be one of the most used functions.

		// Look for a user with this combination of attributes.
		return dbController.doesUserExist(username, ID, email, password)
		.then(function(user) {

			// If the user doesn't exist, reject with a not authorized.
			if (user == undefined) {
				return reject(notAuthorized());
			}

			// The user exists, return the id of the user.
			console.log("user is: ", user);
			return resolve(user.id);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}

function notAuthorized() {
	var err = new Error("Not Authorized.");
	err.status = 403;
	return err;
}
