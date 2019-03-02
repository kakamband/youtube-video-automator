var Promise = require("bluebird");
var Commenter = require('../commenter/commenter');
var Helpers = require('./helpers_tester'); // Need this file, fill out the helpers test template file to get this working.

// Fill this out however you want.
module.exports.Test = function() {
	return new Promise(function(resolve, reject) {
		var google = Helpers.getGoogleAuthenticated();

		// Fill out anything below here.
		const youtube = google.youtube({ version:'v3'});
		Commenter.addDefaultComment(youtube, "Cmlb_4_pMyE", "UCqN08iiYW-mBhVkR3mjKEqw", "League of Legends")
		.then(function(result) {
			return resolve(result);
		})
		.catch(function(err) {
			return reject(err);
		});
	});
}
