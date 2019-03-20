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

// updateSetting
// Updates a users default setting
module.exports.updateSetting = function(username, pmsID, email, password, settingName, settingJSON) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            return updateDefaultSetting(pmsID, settingName, settingJSON);
        })
        .then(function(ok) {
            return resolve(ok);
        })
        .catch(function(err) {
            return reject(err);
        });
    });
}

// getSettings
// Gets a users settings, can have a few scopes:
// 1) overview -> only returns the count of things, and basic numbers.
// 2) setting_name -> gets that specific setting
module.exports.getSettings = function(username, pmsID, email, password, scope) {
    return new Promise(function(resolve, reject) {
        return validateUserAndGetID(username, pmsID, email, password)
        .then(function(id) {
            return getSettingsHelper(pmsID, scope);
        })
        .then(function(results) {
            return resolve(results);
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

function getSettingsHelper(pmsID, scope) {
    return new Promise(function(resolve, reject) {
        switch (scope) {
            case "overview":
                return dbController.settingsOverview(pmsID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "minimum-length":
                return reject(shouldHaveObtainedFromOverview());
            case "maximum-length":
                return reject(shouldHaveObtainedFromOverview());
            case "game-playlists":
                return dbController.getPlaylists(pmsID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-comments":
                return dbController.getComments(pmsID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-like":
                return reject(shouldHaveObtainedFromOverview());
            case "default-category":
                return reject(shouldHaveObtainedFromOverview());
            case "default-signature":
                return dbController.getSignatures(pmsID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-tags":
                return dbController.getTags(pmsID)
                .then(function(results) {
                    return resolve(results);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-language":
                return reject(shouldHaveObtainedFromOverview());
            case "default-thumbnail":
                return resolve(true);
            default:
                return reject(invalidScope());
        }
    });
}

function updateDefaultSetting(pmsID, settingName, settingJSON) {
    return new Promise(function(resolve, reject) {
        switch (settingName) {
            case "minimum-length":
                var setting = JSON.parse(settingJSON);
                
                if (parseInt(setting) < 2) {
                    setting = 2;
                }
                if (parseInt(setting) > 24) {
                    setting = 24;
                }

                return dbController.updateSimpleSetting(pmsID, settingName, setting + "")
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "maximum-length":
                var setting = JSON.parse(settingJSON);
                
                if (parseInt(setting) < 3) {
                    setting = 3;
                }
                if (parseInt(setting) > 25) {
                    setting = 25;
                }

                return dbController.updateSimpleSetting(pmsID, settingName, setting + "")
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "game-playlists":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next1() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].playlistID == undefined || setting[count].playlistID == "") {
                        return reject(invalidPlaylist());
                    }

                    return dbController.addPlaylist(pmsID, setting[count].gameName, setting[count].playlistID)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next1();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next1();
            case "remove-game-playlists":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next2() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].playlistID == undefined || setting[count].playlistID == "") {
                        return reject(invalidPlaylist());
                    }

                    return dbController.deletePlaylist(pmsID, setting[count].gameName, setting[count].playlistID)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next2();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next2();
            case "default-comments":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next3() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].comment == undefined || setting[count].comment == "") {
                        return reject(invalidComment());
                    }

                    return dbController.addComment(pmsID, setting[count].gameName, setting[count].comment)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next3();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next3();
            case "remove-default-comments":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next4() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].comment == undefined || setting[count].comment == "") {
                        return reject(invalidComment());
                    }

                    return dbController.removeComment(pmsID, setting[count].gameName, setting[count].comment)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next4();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next4();
            case "default-like":
                var setting = JSON.parse(settingJSON);
                
                if (setting != true && setting != false && setting != "true" && setting != "false") {
                    setting = true;
                }

                return dbController.updateSimpleSetting(pmsID, settingName, setting + "")
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-category":
                var setting = settingJSON;
                if (!isValidCategory(setting)) {
                    return reject(invalidCategory());
                }
                
                return dbController.updateSimpleSetting(pmsID, settingName, setting + "")
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-signature":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next5() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].signature == undefined || setting[count].signature == "") {
                        return reject(invalidSignature());
                    }

                    return dbController.addSignature(pmsID, setting[count].gameName, setting[count].signature)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next5();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next5();
            case "remove-default-signature":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next6() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].signature == undefined || setting[count].signature == "") {
                        return reject(invalidSignature());
                    }

                    return dbController.removeSignature(pmsID, setting[count].gameName, setting[count].signature)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next6();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next6();
            case "default-tags":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next7() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].tag == undefined || setting[count].tag == "") {
                        return reject(invalidTag());
                    }

                    return dbController.addTag(pmsID, setting[count].gameName, setting[count].tag)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next7();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next7();
            case "remove-default-tags":
                var setting = JSON.parse(settingJSON);

                if (setting.length == 0) {
                    return resolve(true);
                }

                var count = 0;
                function next8() {
                    if (setting.length < count || 
                        setting[count].gameName == undefined || setting[count].gameName == "" ||
                        setting[count].tag == undefined || setting[count].tag == "") {
                        return reject(invalidTag());
                    }

                    return dbController.removeTag(pmsID, setting[count].gameName, setting[count].tag)
                    .then(function() {
                        count++;

                        if (count < setting.length) {
                            return next8();
                        } else {
                            return resolve(true);
                        }
                    })
                    .catch(function(err) {
                        return reject(err);
                    });
                }

                return next8();
            case "default-language":
                var setting = settingJSON;
                if (!validLanguage(setting)) {
                    return reject(invalidLanguage());
                }

                return dbController.updateSimpleSetting(pmsID, settingName, setting + "")
                .then(function() {
                    return resolve(true);
                })
                .catch(function(err) {
                    return reject(err);
                });
            case "default-thumbnail":
                return resolve(true);
            default:
                return reject(invalidSetting());
        }
    });
}

function isValidCategory(item) {
    var categories = [
        2, // - Autos & Vehicles
        1, // -  Film & Animation
        10, // - Music
        15, // - Pets & Animals
        17, // - Sports
        18, // - Short Movies
        19, // - Travel & Events
        20, // - Gaming
        21, // - Videoblogging
        22, // - People & Blogs
        23, // - Comedy
        24, // - Entertainment
        25, // - News & Politics
        26, // - Howto & Style
        27, // - Education
        28, // - Science & Technology
        29, // - Nonprofits & Activism
        30, // - Movies
        31, // - Anime/Animation
        32, // - Action/Adventure
        33, // - Classics
        34, // - Comedy
        35, // - Documentary
        36, // - Drama
        37, // - Family
        38, // - Foreign
        39, // - Horror
        40, // - Sci-Fi/Fantasy
        41, // - Thriller
        42, // - Shorts
        43, // - Shows
        44 // - Trailers
    ];

    return (categories.indexOf(parseInt(item)) >= 0);
}

function validLanguage(item) {
    var languages = [
    "af", "az", "id", "ms", "bs", "ca", "cs", "da", "de", "et", "en-GB", "en", "es", "es-419", 
    "es-US", "eu", "fil", "fr", "fr-CA", "gl", "hr", "zu", "is", "it", "sw", "lv", "lt", "hu", 
    "nl", "no", "uz", "pl", "pt-PT", "pt", "ro", "sq", "sk", "sl", "sr-Latn", "fi", "sv", "vi", 
    "tr", "be", "bg", "ky", "kk", "mk", "mn", "ru", "sr", "uk", "el", "hy", "iw", "ur", "ar", 
    "fa", "ne", "mr", "hi", "bn", "pa", "gu", "ta", "te", "kn", "ml", "si", "th", "lo", "my", 
    "ka", "am", "km", "zh-CN", "zh-TW", "zh-HK", "ja", "ko"];

    return (languages.indexOf(item) >= 0);
}

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

function shouldHaveObtainedFromOverview() {
    var err = new Error("This value should have been obtained from the overview scope.");
    err.status = 400;
    return err;
}

function invalidScope() {
    var err = new Error("Invalid Scope.");
    err.status = 400;
    return err;
}

function invalidTag() {
    var err = new Error("Invalid Signature.");
    err.status = 400;
    return err;
}

function invalidSignature() {
    var err = new Error("Invalid Signature.");
    err.status = 400;
    return err;
}

function invalidComment() {
    var err = new Error("Invalid Comment.");
    err.status = 400;
    return err;
}

function invalidSetting() {
    var err = new Error("Invalid Setting Name.");
    err.status = 400;
    return err;
}

function invalidPlaylist() {
    var err = new Error("Invalid Playlist.");
    err.status = 400;
    return err;
}

function invalidLanguage() {
    var err = new Error("Invalid Language.");
    err.status = 400;
    return err;
}

function invalidCategory() {
    var err = new Error("Invalid Category.");
    err.status = 400;
    return err;
}

function notAuthorized() {
	var err = new Error("Not Authorized.");
	err.status = 403;
	return err;
}
