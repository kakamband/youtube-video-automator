var Promise = require('bluebird');

module.exports.scopeConfigureWUsername = function(routeName, body, username) {
	Sentry.configureScope((scope) => {
		scope.setTag("route", routeName);
		scope.setExtra("body", body);
		scope.setUser({"username": username});
	});
}

module.exports.scopeConfigureWID = function(routeName, body, user_id) {
	Sentry.configureScope((scope) => {
		scope.setTag("route", routeName);
		scope.setExtra("body", body);
		scope.setUser({"id": user_id});
	});
}

module.exports.scopeConfigure = function(routeName, body) {
	Sentry.configureScope((scope) => {
		scope.setTag("route", routeName);
		scope.setExtra("body", body);
	});
}

module.exports.errorHelper = function(next, err) {
	Sentry.captureException(err);
	next(err);
}

module.exports.emitSimpleError = function(err) {
	Sentry.captureException(err);
}
