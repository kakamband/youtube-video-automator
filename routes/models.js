var Promise = require('bluebird');
var DefinedErrors = require('../errors/defined_errors');

// Routes
// -------------------

// Starts the clip
module.exports.START_CLIPPING = "/start/clip";

// Ends the clip
module.exports.END_CLIPPING = "/end/clip";

// Registers a user to the server
module.exports.USER_REGISTER = "/user/register";

// Updates a users email or password
module.exports.USER_UPDATE = "/user/update";

// Introduces a new user to the server
module.exports.USER_INTRO = "/user/create";

// Updates specifically a users password (from the forget password page)
module.exports.USER_PASSWORD_UPDATE = "/user/update/password";

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

// Sets a clip as exclusive
module.exports.SET_CLIP_EXCLUSIVE = "/user/clip/exclusive";

// Adds or updates a title for this clip
module.exports.SET_CLIP_TITLE = "/user/clip/title";

// Adds or updates a description for this clip
module.exports.SET_CLIP_DESCRIPTION = "/user/clip/description";

// Sets a clip as deleted (it will then be deleted 48 hours later)
module.exports.SET_CLIP_DELETED = "/user/clip/delete";

// Sets a custom option for a specific clip only
module.exports.SET_CUSTOM_OPTION = "/user/clip/custom/option";

// Checks if the clip has passed the AD testing phase (this is polled every 5 seconds)
module.exports.POLL_AD_PHASE = "/user/clip/ad/free";

// Uploads an thumbnail image from the frontend
module.exports.UPLOAD_THUMBNAIL_IMG = "/user/thumbnail/upload";

// Swaps a clips order
module.exports.SWAP_CLIP_ORDER = "/user/clip/swap-order";

// Returns the processing time of a video, or if it won't be processed
module.exports.POLL_PROCESSING_TIME = "/user/video/processing/estimate";

// Returns all the data for the videos page
module.exports.GET_VIDEOS_DATA = "/user/videos/info";

// Returns a new set of data for the videos page (through pagination)
module.exports.GET_VIDEOS_PAGE = "/user/videos/page";

// Starts a intro and outro multipart upload
module.exports.UPLOAD_INTRO_OUTRO_INIT = "/user/intro-outro/upload/init";

// Uploads a intro or outro to the server
module.exports.UPLOAD_INTRO_OUTRO = "/user/intro-outro/upload";

// Ends a intro and outro multipart upload
module.exports.UPLOAD_INTRO_OUTRO_DONE = "/user/intro-outro/upload/done";

// Deletes an intro or outro
module.exports.DELETE_INTRO_OUTRO = "/user/intro-outro/delete";
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
	[this.USER_REGISTER, {
		method: "post",
		required_body: [],
		validateParams: function(body, params) {
			return validateHelper(body, params, null, null);
		}
	}],
	[this.USER_UPDATE, {
		method: "post",
		required_body: [],
		validateParams: function(body, params) {
			return validateHelper(body, params, null, null);
		}
	}],
	[this.USER_PASSWORD_UPDATE, {
		method: "post",
		required_body: [],
		validateParams: function(body, params) {
			return validateHelper(body, params, null, null);
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
	[this.SET_CLIP_EXCLUSIVE, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("download_id", "string"),
			nameAndType("exclusive", "boolean")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.SET_CLIP_TITLE, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("download_id", "string"),
			nameAndType("title", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.SET_CLIP_DESCRIPTION, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("download_id", "string"),
			nameAndType("description", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.SET_CLIP_DELETED, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("download_id", "string"),
			nameAndType("delete", "boolean")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.SET_CUSTOM_OPTION, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("download_id", "string"),
			nameAndType("option_name", "string"),
			nameAndType("option_value", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.POLL_AD_PHASE, {
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
	[this.UPLOAD_THUMBNAIL_IMG, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("image_b64", "string"),
			nameAndType("scope", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.SWAP_CLIP_ORDER, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("download_id_1", "string"),
			nameAndType("download_id_2", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.POLL_PROCESSING_TIME, {
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
	[this.GET_VIDEOS_DATA, {
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
	[this.GET_VIDEOS_PAGE, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("video_type", "string"),
			nameAndType("page_number", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.UPLOAD_INTRO_OUTRO, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("nonce", "string"),
			nameAndType("video_data", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.UPLOAD_INTRO_OUTRO_INIT, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("game_name", "string"),
			nameAndType("intro_or_outro", "string"),
			nameAndType("file_name", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.UPLOAD_INTRO_OUTRO_DONE, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("nonce", "string")
		],
		validateParams: function(body, params) {
			return validateHelper(body, params, this.required_body, null);
		}
	}],
	[this.DELETE_INTRO_OUTRO, {
		method: "post",
		required_body: [
			// The default required for authenticated requests.
			nameAndType("username", "string"),
			nameAndType("user_id", "string"),
			nameAndType("email", "string"),
			nameAndType("password", "string"),

			nameAndType("game", "string"),
			nameAndType("link_url", "string")
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
		case "boolean":
			return (typeof val == "boolean" || val == "true" || val == "false");
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
		return DefinedErrors.missingBodyParams(missingBody.toString(), badTypeParams.toString(), missingParams.toString());
	}

	return undefined;
}
