var Promise = require('bluebird');

// Routes
// -------------------

// Starts the clip
module.exports.START_CLIPPING = "/start/clip";

// Ends the clip
module.exports.END_CLIPPING = "/end/clip";

// Introduces a new user to the server
module.exports.USER_INTRO = "/user/create";

// Asks if a user has a token stored
module.exports.USER_HAS_TOKEN = "/user/has-token";

// Asks for a link to get a token
module.exports.USER_TOKEN_LINK = "/user/token/link";

// -------------------

// Route definitions
module.exports.routes = new Map([
	[this.START_CLIPPING, {
		method: "post",
		required_body: [
			nameAndType("user_id", "string"),
			nameAndType("twitch_link", "string"),
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.END_CLIPPING, {
		method: "post",
		required_body: [
			nameAndType("user_id", "string"),
			nameAndType("twitch_link", "string"),
			nameAndType("download_id", "string"),
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.USER_INTRO, {
		method: "post",
		required_body: [
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("subscriptions", "string"),
			nameAndType("payments", "string"),
			nameAndType("password", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.USER_HAS_TOKEN, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.USER_TOKEN_LINK, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
]);

function nameAndType(n, t) {
	return {
		name: n,
		type: t
	}
}

function validType(type, val) {
	switch (type) {
		case "string":
			return (typeof val == "string");
		case "int":
			return (typeof val == "number");
		case "bool":
			return (typeof val == "boolean");
		case "object":
			return (typeof val == "object");
		return true;
	}
}

function validateHelper(body, params, neededBody, neededParams) {
	var missingBody = [];
	for (var i = 0; neededBody && i < neededBody.length; i++) {
		if (!Object.prototype.hasOwnProperty.call(body, neededBody[i].name)) {
			missingBody.push(neededBody[i].name);
		}
	}

	var badTypeParams = [];
	for (var i = 0; neededBody && i < neededBody.length; i++) {
		if (Object.prototype.hasOwnProperty.call(body, neededBody[i].name)) {
			if (!validType(neededBody[i].type, body[neededBody[i].name])) {
				badTypeParams.push(neededBody[i].name + "(" + neededBody[i].type + ")");
			}
		}
	}

	var missingParams = [];
	for (var i = 0; neededParams && i < neededParams.length; i++) {
		if (!Object.prototype.hasOwnProperty.call(body, neededParams[i])) {
			missingParams.push(neededParams[i]);
		}
	}

	if (missingBody.length > 0 || badTypeParams.length > 0 || missingParams.length > 0) {
		var err = new Error(
			'Missing from body: [' + missingBody.toString() + ']. ' +
			'Inproper type parameters: [' + badTypeParams.toString() + ']. ' +
			'Missing parameters: [' + missingParams.toString() + '].');
    	err.status = 400;
    	return err;
	}

	return undefined;
}
