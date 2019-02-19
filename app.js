var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var twitch = require('twitch-api-v5');
var Secrets = require('./config/secrets');
var Poller = require('./poller/poller');
var Attr = require('./config/attributes');
var cLogger = require('color-log');
var Models = require('./models/database');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

var dbConfig = {
  client: 'pg',
  connection: Attr.PG_CONNECTION_STR,
  searchPath: ['knex', 'public']
};

var knex = require('knex')(dbConfig);

knex.raw('select 1+1 as result').then(function() {
	cLogger.info("Did connect succesfully to db.\n");
	Models.initialize(knex)
	.then(function() {
		// Setup twitch connection
		twitch.clientID = Secrets.TWITCH_CLIENT_ID;
		global.twitch = twitch;

		// Start Polling for Clips
		Poller.pollForClips();
	})
	.catch(function(err) {
		cLogger.error("Did not initialize database models.");
	});
}).catch(function() {
	cLogger.error("Did not connect succesfully to db.");
});

// Global knex init
global.knex = knex;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
