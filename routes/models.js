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

// Asks if a user has created an auth token today
module.exports.USER_HAS_NEW_TOKEN = "/user/has-new-token";

// They have marked that they have seen a notification
module.exports.SEEN_NOTIFICATION = "/user/notification/seen";

// Updates a users default setting
module.exports.UPDATE_SETTING = "/user/setting/update";

// Gets the default settings, based on scope will return different things.
module.exports.GET_DEFAULT_SETTINGS = "/user/setting";

// Gets the default settings, based on scope will return different things.
module.exports.GET_GAME_LIST = "/game/list";

// Gets the default settings, based on scope will return different things.
module.exports.IS_USER_DOWNLOADING = "/user/currently-downloading";

// Gets some information about the current clip
module.exports.GET_CLIP_INFO = "/user/clip/info";

// An endpoint that users poll to check if there is a cdn url of the video yet
module.exports.CLIP_VIDEO_POLL = "/user/clip/video";

// -------------------

// Route definitions
module.exports.routes = new Map([
	[this.START_CLIPPING, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("twitch_link", "string"),
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.END_CLIPPING, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

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
	[this.USER_HAS_NEW_TOKEN, {
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
	[this.SEEN_NOTIFICATION, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("notifiation_name", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.UPDATE_SETTING, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("setting_name", "string"),
			nameAndType("setting_json", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.GET_DEFAULT_SETTINGS, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("scope", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.GET_GAME_LIST, {
		method: "post",
		validateParams: function(body, params) {
			return validateHelper(body, params, null, null);
		}
	}],
	[this.IS_USER_DOWNLOADING, {
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
	[this.GET_CLIP_INFO, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("download_id", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.CLIP_VIDEO_POLL, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("download_id", "string")
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
