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
var Downloader = require('./downloader/downloader');
var Combiner = require('./combiner/combiner');
var Uploader = require('./uploader/uploader');
var shell = require('shelljs');
var Recover = require('./recover/recover');
var Hijacker = require('./hijacker/hijacker');
var TesterHelper = require('./test_helper/helpers');
var OauthFlow = require('./oauth/oauth_flow');
var Worker = require('./worker/worker_producer');
var redis = require("redis");
var Promise = require('bluebird');
const readline = require('readline');
const Sentry = require('@sentry/node');
var emailer = require('./emailer/emailer');
var CronHandler = require('./cron/cron_handler');

var index = require('./routes/index');

var app = express();

global.ORIGIN_PATH = (shell.pwd() + "/");
cLogger.info("The global path is: " + ORIGIN_PATH);

// Initialize Sentry
Sentry.init({ 
  dsn: Secrets.SENTRY_DSN,
  release: Attr.RELEASE_VERSION
});

// Global Sentry init
Sentry.configureScope((scope) => {
  scope.setTag("scope", "server-routes");
  scope.setTag("environment", Attr.SERVER_ENVIRONMENT);
});
global.Sentry = Sentry;

var dbConnection = {
	host: Attr.PG_CONNECTION_HOST,
	database: Attr.PG_CONNECTION_DB_NAME
};

if (Attr.PG_REQ_USER) {
	dbConnection.user = Attr.PG_USER_NAME;
	dbConnection.password = Attr.PG_USER_PASSWORD;
}

if (Attr.PG_CONNECTION_PORT) {
	dbConnection.port = Attr.PG_CONNECTION_PORT;
}

var dbConfig = {
	client: 'pg',
	connection: dbConnection,
	searchPath: ['knex', 'public']
};

var knex = require('knex')(dbConfig);

// Global knex init
global.knex = knex;

// For testing this can be enabled to show all the queries before they are reun
// knex.on('query', console.log)

var redisClient = redis.createClient({
	host: Attr.REDIS_HOST,
	port: Attr.REDIS_PORT
});

global.redis = redisClient;

// Initialize the SES Emailer client
emailer.initClient();

// Defines what process is run
var processType = 0;

// Check for parameters
if (process.argv.length == 3) {
	switch (process.argv[2]) {
		case "recover-content":
			processType = 1;
			break;
		case "recover":
			processType = 2;
			break;
		case "stream-hijack":
			processType = 3;
			break;
		case "test":
			processType = 4;
			break;
		case "oauth":
			processType = 5;
			break;
		case "rm-oauth":
			processType = 6;
			break;
		case "open":
			processType = 7;
			break;
		default:
			processType = 0;
	}
}

switch (processType) {

	// Content Recover, looks through video_data and makes a recovery of the videos and inserts them into video_data_saved
	// Usually this process happens implicitly, however this can be run to manually do it.
	// Helpful for testing, and when error occurs.
	case 1:
		// This should be run IF AND ONLY IF the videos were succesfully made, however none of the videos were uploaded for whatever reason.
		// AND the videos weren't automatically recovered.

		cLogger.info("Starting Content Recovery Process.");
		knex.raw('select 1+1 as result')
		.then(function() {
			cLogger.info("Did connect succesfully to db.\n");
			return Models.initialize(knex);
		}).then(function() {
			return Recover.recoverFromNothing();
		}).then(function() {
			cLogger.info("Finished content recovery. All of the recovered files should be in video_data_saved/");
			process.exit();
		}).catch(function(err) {
			cLogger.error("Error during process: " + err);
			process.exit();
		});
		break;

	// Recover Upload, tries to upload all of the videos in 'video_data_saved' directory.
	// This process is done everytime the normal process is finished also.
	// Once this process is finished the data that is in video_data_saved directory, that has been uploaded is deleted.
	case 2:
		// This should be run IF AND ONLY IF the videos content were succesfully recovered (put into video_data_saved) and have yet to be uploaded.

		cLogger.info("Starting Recovery Process.");
		knex.raw('select 1+1 as result')
		.then(function() {
			cLogger.info("Did connect succesfully to db.\n");
			return Models.initialize(knex);
		}).then(function() {
			return Uploader.uploadRecoveredVideos();
		}).then(function() {
			cLogger.info("Finsihed the upload recovery, there shouldn't be any remaining videos in video_data_saved/");
			process.exit();
		}).catch(function(err) {
			cLogger.error("Error during process: " + err);
			process.exit();
		});
		break;

	// Stream Hijack, this will wait until the user tells the server to start hijacking the stream. And when the user does let the server know
	// it will automatically start downloading the stream into a vod. While this vod is downloading, we let the user choose when to stop downloading,
	// when they choose to stop downloading we stop creating the vod and put it into 'video_data_hijacks' folder. If there are enough clips to make a video
	// of acceptable size, we either start putting clips together or just export one clip (if the clip is long enough itself). After the export exactly ONE youtube
	// video will be attempted to be uploaded.
	case 3:

		cLogger.info("Starting Stream Hijacking Process.");
		knex.raw('select 1+1 as result')
		.then(function() {
			cLogger.info("Did connect succesfully to db.\n");
			return Models.initialize(knex);
		}).then(function() {
			// Setup twitch connection
			twitch.clientID = Secrets.TWITCH_CLIENT_ID;
			global.twitch = twitch;

			return new Promise(function(resolve, reject) {

				function next() {
					return Hijacker.startHijacking()
					.then(function() {
						return restart()
						.then(function(redo) {
							if (redo) {
								shell.cd(ORIGIN_PATH);
								return next();
							} else {
								return resolve();
							}
						})
						.catch(function(err) {
							return reject(err);
						});
					})
					.catch(function(err) {
						return reject(err);
					});
				}

				next();
			});
		}).then(function() {
			cLogger.info("Done Hijacking.");
			process.exit();
		}).catch(function(err) {
			cLogger.error("Error during process: " + err);
			process.exit();
		});
		break;

	// Test tests a feature of the developers choosing
	case 4:
	cLogger.info("Starting Test Process.");
	knex.raw('select 1+1 as result')
		.then(function() {
			cLogger.info("Did connect succesfully to db.\n");
			return Models.initialize(knex);
		}).then(function() {
			return TesterHelper.Test();
		}).then(function(result) {
			cLogger.info("Done Testing. Possible result: " + result);
			process.exit();
		}).catch(function(err) {
			cLogger.error("Error during process: " + err);
			process.exit();
		});
		break;

	// Oauth Init initializes the db with a refresh token for future use. This should be run first before anything.
	case 5:
	cLogger.info("Starting OAuth Init Process.");
	knex.raw('select 1+1 as result')
		.then(function() {
			cLogger.info("Did connect succesfully to db.\n");
			return Models.initialize(knex);
		}).then(function() {
			return OauthFlow.init();
		}).then(function(result) {
			cLogger.info("Done OAuth Init. Hanging while we wait for the user to authenticate in the browser, and for google to callback to us.");
		}).catch(function(err) {
			cLogger.error("Error during process: " + err);
			process.exit();
		});
		break;

	// Oauth RM removes the refresh token from the database.
	case 6:
	cLogger.info("Starting OAuth RM Process.");
	knex.raw('select 1+1 as result')
		.then(function() {
			cLogger.info("Did connect succesfully to db.\n");
			return Models.initialize(knex);
		}).then(function() {
			return OauthFlow.invalidateToken();
		}).then(function(result) {
			cLogger.info("Done OAuth RM. Possible result: " + result);
			process.exit();
		}).catch(function(err) {
			cLogger.error("Error during process: " + err);
			process.exit();
		});
		break;

	case 7:
		Worker.initProducers()
		.then(function() {
			return knex.raw('select 1+1 as result');
		})
		.then(function() {
			cLogger.info("Did connect succesfully to db.\n");
			return Models.initialize(knex);
		})
		.then(function() {
			// Setup twitch connection
			twitch.clientID = Secrets.TWITCH_CLIENT_ID;
			global.twitch = twitch;

			return CronHandler.init();
		})
		.then(function() {
			cLogger.info("Not running any process, just letting the node server run.");
		})
		.catch(function(err) {
			cLogger.error("Error during process: " + err);
			process.exit();
		});
		break;

	// Default and normal process to run. This process polls for the highest rated clips on twitch.
	// It then downloads these clips sequentially, until all the clips are downloaded.
	// It then starts combining the clips into a single video (this is a slow process).
	// After it then starts to automatically upload it to youtube.
	// If youtube upload fails it moves the files and the needed data to post to a recovery area in video_data_saved directory.
	// If all the videos are successfully saved it then starts trying to upload the saved videos right away.
	case 0:
	default:
		cLogger.info("Starting Normal Process.");
		knex.raw('select 1+1 as result')
		.then(function() {
			cLogger.info("Did connect succesfully to db.\n");
			return Models.initialize(knex);
		}).then(function() {
			// Setup twitch connection
			twitch.clientID = Secrets.TWITCH_CLIENT_ID;
			global.twitch = twitch;

			// Start Polling for Clips
			cLogger.warn("\nStarting Polling!\n");
			return Poller.pollForClips();
		}).then(function(results) {
			cLogger.warn("\nFinished Polling, Starting Downloading!\n");
			return Downloader.downloadContent(results);
		}).then(function(clipsLenMap) {
			cLogger.warn("\nFinished Downloading, Starting Combining!\n");
			return Combiner.combineContent(clipsLenMap);
		}).then(function(finishedFiles) {
			cLogger.warn("\nFinished Combining, Starting Uploading!\n");
			return Uploader.startUploadProcess(finishedFiles)
		}).then(function() {
			cLogger.warn("\nFinished Uploading. Process complete, terminating.");
			process.exit();
			return;
		}).catch(function(err) {
			cLogger.error("Error during process: " + err);
			process.exit();
		});
		break;
}

function restart() {
	const rl = readline.createInterface({
	  input: process.stdin,
	  output: process.stdout,
  	  terminal: false
	});

	return new Promise(function(resolve, reject) {
		cLogger.mark("\nDo you want to restart? (Yes/y to restart, anything else to exit)");
		rl.question("", (ans) => {
			if (ans.toLowerCase() == "yes" || ans.toLowerCase() == "y") {
				return resolve(true);
			} else {
				return resolve(false);
			}
		});
	});
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {

    res.setHeader('Access-Control-Allow-Origin', "https://twitchautomator.com");
    //res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    var headers = req.headers['access-control-request-headers']; 
    if (headers) {
      res.setHeader('Access-Control-Allow-Headers', headers);
    }

    // Pass to next layer of middleware
    next();
});

app.use('/', index);

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

// Handle PM2 shutdowns gracefully
process.on('SIGINT', function() {
	console.log("Shutting down main server.");
	process.exit(0);
});

module.exports = app;
