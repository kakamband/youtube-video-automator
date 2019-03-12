var Promise = require('bluebird');
var cLogger = require('color-log');
var dbController = require('../controller/db');

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// createUser
// Handles the create user endpoint, this endpoint will either create a new user or just update their contents.
module.exports.createUser = function(username, ID, email, password, subs) {
    return new Promise(function(resolve, reject) {
    	cLogger.info("Creating a user.");
    	return dbController.createOrUpdateUser(username, ID, email, password, subs)
    	.then(function() {
    		return resolve();
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
