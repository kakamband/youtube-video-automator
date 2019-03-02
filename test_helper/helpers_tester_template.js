const {google} = require('googleapis');
var Secrets = require('../config/secrets');

// Save this file as 'helpers_tester.js' after filling out the secret files.
// This is JUST for testing purposes.
// Paste the plaintext version of the refresh token.
module.exports = {
	getGoogleAuthenticated: function() {
		const oauth2Client = new google.auth.OAuth2(
			Secrets.GOOGLE_API_CLIENT_ID,
			Secrets.GOOGLE_API_CLIENT_SECRET,
			Secrets.GOOGLE_API_REDIRECT_URI
		);

		oauth2Client.setCredentials({
			refresh_token: "PLAINTEXT REFRESH TOKEN HERE."
		});
		google.options({
			auth: oauth2Client
		});

		return google;
	}
};