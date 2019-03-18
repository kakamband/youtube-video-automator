var Promise = require('bluebird');
var cLogger = require('color-log');
var dbController = require('../controller/db');
var OAuthFlow = require('../oauth/oauth_flow');

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// createUser
// Handles the create user endpoint, this endpoint will either create a new user or just update their contents.
module.exports.createUser = function(username, ID, email, password, payments, subs, currentRoute) {
    var activeSubscriptionNum = -1;

    return new Promise(function(resolve, reject) {
    	return dbController.createOrUpdateUser(username, ID, email, password, payments, subs)
    	.then(function(activeSubscription) {
            activeSubscriptionNum = activeSubscription;

            if (currentRoute == null) {
                return resolve([activeSubscription, []]);
            } else {
                return getCurrentRouteNotifications(ID, currentRoute);
            }
    	})
        .then(function(notifications) {
            return resolve([activeSubscriptionNum, notifications]);
        })
    	.catch(function(err) {
    		return reject(err);
    	});
    });
};

// hasUserToken
// Returns whether a user has a token stored already. Or not. This is an authenticated route.
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

// hasNewUserToken
// Returns whether a user has a token stored today. Or not. This is an authenticated route.
module.exports.hasNewUserToken = function(username, ID, email, password) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, ID, email, password)
        .then(function(id) {
            return dbController.hasNewUserToken(id);
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

// getTokenLink
// Returns a link to authenticate with Youtube. This is an authenticated route.
module.exports.getTokenLink = function(username, ID, email, password) {
    return new Promise(function(resolve, reject) {
    	return validateUserAndGetID(username, ID, email, password)
    	.then(function(id) {
            return OAuthFlow.initLink(id);
    	})
    	.then(function(url) {
    		return resolve(url);
    	})
    	.catch(function(err) {
    		return reject(err);
    	});
    });
};

// seenNotification
// Marks a notification as seen
module.exports.seenNotification = function(username, ID, email, password, notifName) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, ID, email, password)
        .then(function(id) {
            return dbController.seenNotification(ID, notifName);
        })
        .then(function() {
            return resolve();
        })
        .catch(function(err) {
            return reject(err);
        })
    });
};

// --------------------------------------------
// Exported compartmentalized functions above.
// --------------------------------------------
// Helper functions below.
// --------------------------------------------

function getCurrentRouteNotifications(ID, currentRoute) {
    return new Promise(function(resolve, reject) {
        switch(currentRoute) {
            case "dashboard":
                return dbController.getDashboardNotifications(ID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "videos":
                return dbController.getVideosNotifications(ID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "account":
                return dbController.getAccountNotifications(ID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "defaults":
                return dbController.getDefaultsNotifications(ID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            default:
                return resolve([]);
        }
    });
}

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
