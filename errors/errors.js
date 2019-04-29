var Promise = require('bluebird');
var DefinedErrors = require('./defined_errors');
var cLogger = require('color-log');

module.exports.scopeConfigureWUsername = function(routeName, body, username) {
	Sentry.configureScope((scope) => {
		scope.setTag("route", routeName);
		scope.setExtra("body", body);
		scope.setUser({"username": username});
		scope.setLevel("error"); // Default scope is an error
	});
}

module.exports.scopeConfigureWID = function(routeName, body, user_id) {
	Sentry.configureScope((scope) => {
		scope.setTag("route", routeName);
		scope.setExtra("body", body);
		scope.setUser({"id": user_id});
		scope.setLevel("error"); // Default scope is an error
	});
}

module.exports.scopeConfigure = function(routeName, body) {
	Sentry.configureScope((scope) => {
		scope.setTag("route", routeName);
		scope.setExtra("body", body);
		scope.setLevel("error"); // Default scope is an error
	});
}

module.exports.scopeConfigureWarning = function(routeName, body) {
	_scopeConfigureWLevel(routeName, body, "warning");
}

module.exports.errorHelper = function(next, err) {
	Sentry.captureException(err);
	cLogger.error(err);

	next(err);
}

module.exports.emitSimpleError = function(err) {
	cLogger.error(err);
	Sentry.captureException(err);
}

module.exports.dbError = function(err) {
	Sentry.captureException(err);
	cLogger.error(err);

	return DefinedErrors.internalServerError();
}

// Helpers below

function _scopeConfigureWLevel(routeName, body, level) {
	Sentry.configureScope((scope) => {
		scope.setTag("route", routeName);
		scope.setExtra("body", body);
		scope.setLevel(level);
	});
}
