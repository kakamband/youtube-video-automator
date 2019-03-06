var express = require('express');
var cLogger = require('color-log');
var uploader = require('../uploader/uploader');
var OauthFlow = require('../oauth/oauth_flow');
var router = express.Router();
var Models = require('./models');
var Worker = require('../worker/worker');
// -------------------

function validFirst(route, req, res, next, continuation) {
	var routeObj = Models.routes.get(route);

	// Validate that the paramters passed are correct and all present
	var invalidParamsErr = routeObj.validateParams(req.body, req.params);
	if (invalidParamsErr != undefined) {
	    return next(invalidParamsErr);
	}

	continuation();
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/oauthcallback', function(req, res, next) {
	res.render('index', { title: 'Thanks for linking your Youtube Account!' });
	uploader.startUploadingWithToken(req.query.code, req.query.state)
	.then(function() {
		cLogger.info("Done uploading.");
	})
	.catch(function(err) {
		cLogger.error("Error uploading: ", err);
	});
});

router.get('/oauthcallback/init', function(req, res, next) {
	res.render('index2', { title: 'Thanks for linking your Youtube Account!' });
	OauthFlow.initCallback(req.query.code)
	.then(function() {
		cLogger.info("Done adding refresh token to the DB. You can now perform any automated Youtube uploads. Terminating now.");
		process.exit();
	})
	.catch(function(err) {
		cLogger.error("Error adding refresh token to DB: ", err);
	});
});

router.post(Models.START_CLIPPING, function(req, res, next) {
	validFirst(Models.START_CLIPPING, req, res, next, function() {
		Worker.addDownloadingTask()
	});
});

module.exports = router;
