var express = require('express');
var cLogger = require('color-log');
var uploader = require('../uploader/uploader');
var OauthFlow = require('../oauth/oauth_flow');
var router = express.Router();

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

module.exports = router;
