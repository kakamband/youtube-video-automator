var express = require('express');
var cLogger = require('color-log');
var uploader = require('../uploader/uploader');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/oauthcallback', function(req, res, next) {
	res.render('index', { title: 'Thanks' });
	uploader.startUploadingWithToken(req.query.code, req.query.state)
	.then(function() {
		cLogger.info("Done uploading.");
	})
	.catch(function(err) {
		cLogger.info("Error uploading: ", err);
	});
});

module.exports = router;
