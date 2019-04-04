var Promise = require('bluebird');
var DefinedErrors = require('./defined_errors');
var cLogger = require('color-log');

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
	cLogger.error(err);

	// Sanitize the error for the client, shouldn't be returning it.
	var newError = DefinedErrors.internalServerError();

	next(newError);
}

module.exports.emitSimpleError = function(err) {
	Sentry.captureException(err);
}
