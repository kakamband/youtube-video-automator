var Promise = require('bluebird');
var Attr = require('../config/attributes');
var Secrets = require('../config/secrets');
var cLogger = require('color-log');
const {google} = require('googleapis');
var dbController = require('../controller/db');
const opn = require('opn');

const scopes = [
	// Needed to upload to Youtube, to set thumbnails, add to playlists.
	"https://www.googleapis.com/auth/youtube",

	// Needed to make comments to Youtube.
	"https://www.googleapis.com/auth/youtube.force-ssl"
];

// --------------------------------------------
// Exported compartmentalized functions below.
// --------------------------------------------

// getAccessToken
// Gets access token while in a content flow. This will authenticate and when the user accepts then the videos will start to be uploaded.
// This is the UNSAFE flow. This is a LEGACY function. Should be replaced soon.
// The flow that should be followed is by running 'npm start oauth' before doing anything else to store the OAuth Refresh token in the db.
module.exports.getAccessToken = function(content) {
    return new Promise(function(resolve, reject) {
    	cLogger.info("Looking for refresh tokens.");
    	return dbController.getRefreshToken(Secrets.GOOGLE_API_CLIENT_ID)
    	.then(function(obj) {
			const oauth2Client = new google.auth.OAuth2(
				Secrets.GOOGLE_API_CLIENT_ID,
				Secrets.GOOGLE_API_CLIENT_SECRET,
				Secrets.GOOGLE_API_REDIRECT_URI
			);

    		if (obj == null) { // We dont have any saved refresh tokens, so ask for them
    			cLogger.info("ATTENTION WE NEED YOU TO AUTHENTICATE TO UPLOAD YOUR YOUTUBE VIDEO!");

				var contentStringified = JSON.stringify([...content]);
				var encodedContent = base64url(contentStringified);

				const url = oauth2Client.generateAuthUrl({
					access_type: 'offline',
					scope: scopes,
					state: encodedContent
				});

				opn(url);
				return resolve(false);
    		}

    		cLogger.info("Have saved refresh tokens.");
    		oauth2Client.setCredentials({
    			refresh_token: obj.refresh_token
    		});
    		google.options({
    			auth: oauth2Client
    		});

    		return resolve(true);
    	})
    	.catch(function(err) {
    		return reject(err);
    	});
    });
};

// init
// Starts the initial 'npm start oauth' flow. This flow will do the preliminary work of getting the refresh token stored into the db.
module.exports.init = function() {
	const oauth2Client = new google.auth.OAuth2(
		Secrets.GOOGLE_API_CLIENT_ID,
		Secrets.GOOGLE_API_CLIENT_SECRET,
		Secrets.GOOGLE_API_REDIRECT_URI2
	);

	return new Promise(function(resolve, reject) {
    	return dbController.getRefreshToken(Secrets.GOOGLE_API_CLIENT_ID)
    	.then(function(obj) {
			if (obj != null) {
				return reject(new Error("There already exists a refresh token. If you want to get a new one run 'npm start rm-oauth' first."));
			}

			const url = oauth2Client.generateAuthUrl({
				access_type: 'offline',
				scope: scopes,
				state: "LOCAL"
			});

			opn(url);
			return resolve(false);
    	})
    	.catch(function(err) {
    		return reject(err);
    	});
	});
}

// initLink
// Same as init above, however doesn't open the link on the personal computer. Just returns the link to it.
module.exports.initLink = function(userID) {
	var redirectLink = Secrets.GOOGLE_API_REDIRECT_URI2; // Development
	if (Attr.SERVER_ENVIRONMENT == "production") {
		redirectLink = Secrets.GOOGLE_API_REDIRECT_URI3;
	}

	const oauth2Client = new google.auth.OAuth2(
		Secrets.GOOGLE_API_CLIENT_ID,
		Secrets.GOOGLE_API_CLIENT_SECRET,
		redirectLink
	);

	return new Promise(function(resolve, reject) {

		const url = oauth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: scopes,
			state: userID
		});

		return resolve(url);
	});
}

// initCallback
// This function is called when the user performs the OAuth2 authorization flow that was initialized in the 'init' function above.
// This function just uploads the content to the DB, then terminates the process.
module.exports.initCallback = function(code, userID) {
	var redirectLink = Secrets.GOOGLE_API_REDIRECT_URI2; // Development
	if (Attr.SERVER_ENVIRONMENT == "production") {
		redirectLink = Secrets.GOOGLE_API_REDIRECT_URI3;
	}

	const oauth2Client = new google.auth.OAuth2(
		Secrets.GOOGLE_API_CLIENT_ID,
		Secrets.GOOGLE_API_CLIENT_SECRET,
		redirectLink
	);

	return new Promise(function(resolve, reject) {
		oauth2Client.getToken(code);
		oauth2Client.on('tokens', (tokens) => {
			if (!tokens.refresh_token) {
				cLogger.error("Could not find a refresh token! This means each time we do anything we will need to authenticate again! THIS IS NOT SUPPOSED TO HAPPEN!");
				// TODO: Log this to sentry, we will need to manually support this person.
				// Reference link: https://stackoverflow.com/questions/10827920/not-receiving-google-oauth-refresh-token

				return resolve();
			} else {
				return dbController.addRefreshToken(Secrets.GOOGLE_API_CLIENT_ID, tokens.refresh_token, tokens.access_token, userID)
				.then(function() {
					cLogger.info("Added the refresh & access token to the DB for future use.");
					return resolve(true);
				})
				.catch(function(err) {
					return reject(err);
				});
			}
		});
	});
}

// invalidateToken
// This will invalidate the oauth token, this usually should be done ONLY IF you are changing scopes + adding new scopes. Usually this should never
// be run. As such there is a "Are you sure?" prompt.
module.exports.invalidateToken = function() {
	return new Promise(function(resolve, reject) {
		return dbController.deleteRefreshToken(Secrets.GOOGLE_API_CLIENT_ID)
		.then(function() {
			cLogger.info("Deleted the refresh token.");
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
