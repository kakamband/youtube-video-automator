var express = require('express');
var cLogger = require('color-log');
var uploader = require('../uploader/uploader');
var OauthFlow = require('../oauth/oauth_flow');
var router = express.Router();
var Models = require('./models');
var Worker = require('../worker/worker_producer');
var Hijacker = require('../hijacker/hijacker');
var Users = require('../users/users');
var ErrorHelper = require('../errors/errors');
// -------------------

function validFirst(route, req, res, next, continuation) {
	var routeObj = Models.routes.get(route);

	// Validate that the paramters passed are correct and all present
	var invalidParamsErr = routeObj.validateParams(req.body, req.params);
	if (invalidParamsErr != undefined) {
		ErrorHelper.scopeConfigureInfo(route, req.body);
		return ErrorHelper.errorHelper(next, invalidParamsErr);
	}

	continuation();
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/health', function(req, res, next) {  
	res.json({
  		alive: true,
  	});
});

router.get('/oauthcallback', function(req, res, next) {
	res.render('index', { title: 'Thanks for linking your Youtube Account!' });
	uploader.startUploadingWithToken(req.query.code, req.query.state)
	.then(function() {
		cLogger.info("Done uploading.");
	})
	.catch(function(err) {
		cLogger.error("Error uploading: ", err);
		ErrorHelper.scopeConfigure('/oauthcallback', req.query);
		ErrorHelper.errorHelper(next, err);
	});
});

router.get('/oauthcallback/init', function(req, res, next) {
	if (req.query == undefined) {
		res.redirect('https://www.twitchautomator.com/dashboard?done_auth=' + false + "&reason=" + Buffer.from("User has cancelled authentication. Please retry.").toString('base64'));
	}

	OauthFlow.initCallback(req.query.code, req.query.state)
	.then(function(results) {
		let success = results[0];
		let reason = results[1];

		cLogger.info("Successfully authenticated with users youtube.");
		res.redirect('https://www.twitchautomator.com/dashboard?done_auth=' + success + "&reason=" + Buffer.from(reason).toString('base64'));
	})
	.catch(function(err) {
		cLogger.error("Error adding refresh token to DB: ", err);
		ErrorHelper.scopeConfigure('/oauthcallback/init', req.query);
		ErrorHelper.errorHelper(next, err);
	});
});

router.post(Models.START_CLIPPING, function(req, res, next) {
	validFirst(Models.START_CLIPPING, req, res, next, function() {
		return Users.startClip(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.twitch_link)
		.then(function(results) {
			return res.json({
				success: results[0],
				download_id: results[1]
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.START_CLIPPING, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.END_CLIPPING, function(req, res, next) {
	validFirst(Models.END_CLIPPING, req, res, next, function() {
		return Users.endClip(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.twitch_link, req.body.download_id)
		.then(function() {
			return res.json({
				success: true
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.END_CLIPPING, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.USER_REGISTER, function(req, res, next) {
	validFirst(Models.USER_REGISTER, req, res, next, function() {
		return Users.registerUser(req.body)
		.then(function() {
			return res.json({
				success: true
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.USER_REGISTER, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.USER_UPDATE, function(req, res, next) {
	validFirst(Models.USER_UPDATE, req, res, next, function() {
		return Users.updateUser(req.body)
		.then(function() {
			return res.json({
				success: true
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.USER_UPDATE, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.USER_PASSWORD_UPDATE, function(req, res, next) {
	validFirst(Models.USER_PASSWORD_UPDATE, req, res, next, function() {
		return Users.updateUserPassword(req.body)
		.then(function() {
			return res.json({
				success: true
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.USER_PASSWORD_UPDATE, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.USER_INTRO, function(req, res, next) {
	validFirst(Models.USER_INTRO, req, res, next, function() {
		// If the optional paramter of route was passed
		var currentRoute = null;
		if (req.body.current_route) {
			currentRoute = req.body.current_route;
		}

		return Users.updateUserData(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.payments, req.body.subscriptions, currentRoute)
		.then(function(results) {
			return res.json({
				success: true,
				active_subscription: results[0][0],
				number_videos_left: results[0][1],
				user_banned: results[0][2],
				user_banned_reason: results[0][3],
				notifications: results[1]
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.USER_INTRO, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.USER_HAS_TOKEN, function(req, res, next) {
	validFirst(Models.USER_HAS_TOKEN, req, res, next, function() {
		return Users.hasUserToken(req.body.username, req.body.user_id, req.body.email, req.body.password)
		.then(function(hasToken) {
			return res.json({
				exists: hasToken
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.USER_HAS_TOKEN, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.USER_TOKEN_LINK, function(req, res, next) {
	validFirst(Models.USER_TOKEN_LINK, req, res, next, function() {
		return Users.getTokenLink(req.body.username, req.body.user_id, req.body.email, req.body.password)
		.then(function(tokenLink) {
			return res.json({
				link: tokenLink
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.USER_TOKEN_LINK, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.USER_HAS_NEW_TOKEN, function(req, res, next) {
	validFirst(Models.USER_HAS_NEW_TOKEN, req, res, next, function() {
		return Users.hasNewUserToken(req.body.username, req.body.user_id, req.body.email, req.body.password)
		.then(function(hasToken) {
			return res.json({
				success: hasToken
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.USER_HAS_NEW_TOKEN, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.SEEN_NOTIFICATION, function(req, res, next) {
	validFirst(Models.SEEN_NOTIFICATION, req, res, next, function() {
		return Users.seenNotification(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.notifiation_name)
		.then(function() {
			return res.json({
				success: true
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.SEEN_NOTIFICATION, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.UPDATE_SETTING, function(req, res, next) {
	validFirst(Models.UPDATE_SETTING, req, res, next, function() {
		return Users.updateSetting(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.setting_name, req.body.setting_json)
		.then(function(ok) {
			return res.json({
				success: ok
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.UPDATE_SETTING, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.GET_DEFAULT_SETTINGS, function(req, res, next) {
	validFirst(Models.GET_DEFAULT_SETTINGS, req, res, next, function() {
		return Users.getSettings(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.scope)
		.then(function(results) {
			return res.json({
				results: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.GET_DEFAULT_SETTINGS, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.GET_GAME_LIST, function(req, res, next) {
	validFirst(Models.GET_GAME_LIST, req, res, next, function() {
		return Users.getGamesList()
		.then(function(results) {
			return res.json({
				games: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.GET_GAME_LIST, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.IS_USER_DOWNLOADING, function(req, res, next) {
	validFirst(Models.IS_USER_DOWNLOADING, req, res, next, function() {
		return Users.isUserDownloading(req.body.username, req.body.user_id, req.body.email, req.body.password)
		.then(function(results) {
			return res.json({
				download_id: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.IS_USER_DOWNLOADING, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.GET_CLIP_INFO, function(req, res, next) {
	validFirst(Models.GET_CLIP_INFO, req, res, next, function() {
		return Users.getClipInfo(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.download_id)
		.then(function(results) {
			return res.json({
				clip_info: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.GET_CLIP_INFO, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.CLIP_VIDEO_POLL, function(req, res, next) {
	validFirst(Models.CLIP_VIDEO_POLL, req, res, next, function() {
		return Users.getClipVideo(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.download_id)
		.then(function(results) {
			return res.json({
				clip_video: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.CLIP_VIDEO_POLL, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.SET_CLIP_EXCLUSIVE, function(req, res, next) {
	validFirst(Models.SET_CLIP_EXCLUSIVE, req, res, next, function() {
		var exclusiveVal = req.body.exclusive;
		if (exclusiveVal == "true") {
			exclusiveVal = true;
		} else if (exclusiveVal == "false") {
			exclusiveVal = false;
		}

		return Users.setClipExclusive(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.download_id, exclusiveVal)
		.then(function(results) {
			return res.json({
				success: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.SET_CLIP_EXCLUSIVE, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.SET_CLIP_TITLE, function(req, res, next) {
	validFirst(Models.SET_CLIP_TITLE, req, res, next, function() {
		return Users.setClipTitle(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.download_id, req.body.title)
		.then(function(results) {
			return res.json({
				success: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.SET_CLIP_TITLE, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.SET_CLIP_DESCRIPTION, function(req, res, next) {
	validFirst(Models.SET_CLIP_DESCRIPTION, req, res, next, function() {
		return Users.setClipDescription(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.download_id, req.body.description)
		.then(function(results) {
			return res.json({
				success: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.SET_CLIP_DESCRIPTION, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.SET_CLIP_DELETED, function(req, res, next) {
	validFirst(Models.SET_CLIP_DELETED, req, res, next, function() {
		var deleteVal = req.body.delete;
		if (deleteVal == "true") {
			deleteVal = true;
		} else if (deleteVal == "false") {
			deleteVal = false;
		}

		return Users.setClipDeleted(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.download_id, deleteVal)
		.then(function(results) {
			return res.json({
				success: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.SET_CLIP_DELETED, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.SET_CUSTOM_OPTION, function(req, res, next) {
	validFirst(Models.SET_CUSTOM_OPTION, req, res, next, function() {
		return Users.setClipCustomOption(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.download_id, req.body.option_name, req.body.option_value)
		.then(function(results) {
			return res.json({
				success: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.SET_CUSTOM_OPTION, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.POLL_AD_PHASE, function(req, res, next) {
	validFirst(Models.POLL_AD_PHASE, req, res, next, function() {
		return Users.pollADPhase(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.download_id)
		.then(function(results) {
			return res.json({
				download: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.POLL_AD_PHASE, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.UPLOAD_THUMBNAIL_IMG, function(req, res, next) {
	validFirst(Models.UPLOAD_THUMBNAIL_IMG, req, res, next, function() {
		return Users.uploadThumbnailImage(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.extra_data, req.body.image_b64, req.body.scope)
		.then(function(results) {
			return res.json({
				image_url: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.UPLOAD_THUMBNAIL_IMG, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.SWAP_CLIP_ORDER, function(req, res, next) {
	validFirst(Models.SWAP_CLIP_ORDER, req, res, next, function() {
		return Users.swapClipOrder(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.download_id_1, req.body.download_id_2)
		.then(function(results) {
			return res.json({
				success: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.SWAP_CLIP_ORDER, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.POLL_PROCESSING_TIME, function(req, res, next) {
	validFirst(Models.POLL_PROCESSING_TIME, req, res, next, function() {
		return Users.pollProcessingTime(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.download_id)
		.then(function(results) {
			return res.json({
				processing_estimate: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.POLL_PROCESSING_TIME, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.GET_VIDEOS_DATA, function(req, res, next) {
	validFirst(Models.GET_VIDEOS_DATA, req, res, next, function() {
		return Users.getVideosData(req.body.username, req.body.user_id, req.body.email, req.body.password)
		.then(function(results) {
			return res.json(results);
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.GET_VIDEOS_DATA, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.GET_VIDEOS_PAGE, function(req, res, next) {
	validFirst(Models.GET_VIDEOS_PAGE, req, res, next, function() {
		return Users.getVideosDataPage(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.video_type, req.body.page_number)
		.then(function(results) {
			return res.json(results);
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.GET_VIDEOS_PAGE, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.UPLOAD_INTRO_OUTRO_INIT, function(req, res, next) {
	validFirst(Models.UPLOAD_INTRO_OUTRO_INIT, req, res, next, function() {
		return Users.uploadIntroOrOutroInit(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.game_name, req.body.intro_or_outro, req.body.file_name)
		.then(function(results) {
			return res.json(results);
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.UPLOAD_INTRO_OUTRO_INIT, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.UPLOAD_INTRO_OUTRO, function(req, res, next) {
	validFirst(Models.UPLOAD_INTRO_OUTRO, req, res, next, function() {
		return Users.uploadIntroOrOutro(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.nonce, req.body.video_data)
		.then(function(results) {
			return res.json({
				success: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.UPLOAD_INTRO_OUTRO, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.UPLOAD_INTRO_OUTRO_DONE, function(req, res, next) {
	validFirst(Models.UPLOAD_INTRO_OUTRO_DONE, req, res, next, function() {
		return Users.uploadIntroOrOutroDone(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.nonce)
		.then(function(resp) {
			return res.json(resp);
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.UPLOAD_INTRO_OUTRO_DONE, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.DELETE_INTRO_OUTRO, function(req, res, next) {
	validFirst(Models.DELETE_INTRO_OUTRO, req, res, next, function() {
		return Users.deleteIntroOutro(req.body.username, req.body.user_id, req.body.email, req.body.password, req.body.game, req.body.link_url)
		.then(function(results) {
			return res.json({
				success: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.DELETE_INTRO_OUTRO, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.USER_REVOKE_TOKEN, function(req, res, next) {
	validFirst(Models.USER_REVOKE_TOKEN, req, res, next, function() {
		return Users.revokeAccessToken(req.body.username, req.body.user_id, req.body.email, req.body.password)
		.then(function(results) {
			return res.json({
				success: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.USER_REVOKE_TOKEN, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

router.post(Models.USER_EMAIL_UNSUBSCRIBE, function(req, res, next) {
	validFirst(Models.USER_EMAIL_UNSUBSCRIBE, req, res, next, function() {
		return Users.unsubscribeFromEmail(req.body.user_id, req.body.token)
		.then(function(results) {
			return res.json({
				success: results
			});
		})
		.catch(function(err) {
			ErrorHelper.scopeConfigure(Models.USER_EMAIL_UNSUBSCRIBE, req.body);
			return ErrorHelper.errorHelper(next, err);
		});
	});
});

module.exports = router;
