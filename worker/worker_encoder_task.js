#!/usr/bin/env node

var Attr = require('../config/attributes');
var Secrets = require('../config/secrets');
var cLogger = require('color-log');
var Helpers = require('./worker_helpers');
var shell = require('shelljs');
const Sentry = require('@sentry/node');
var MessageHandler = require('./worker_function_wrappers');
var Promise = require('bluebird');
var ErrorHelper = require('../errors/errors');
var base64url = require('base64url');

// Make sure we can connect to the database.
function knexConnection(cb) {
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

  cLogger.mark("Trying Postgres connection...");
  return knex.raw('select 1+1 as result').then(function() {
    cLogger.info("Did connect succesfully to db.");
    return cb(knex);
  }).catch(function() {
    cLogger.error("Did not connect succesfully.");
    return cb(undefined);
  });
}

// Validate that the user has passed in valid arguments
function parseAndValidateArguments(cb) {
  if (process.argv.length != 5) { // Not enough parameters
    return cb(undefined);
  } else {
    var userID = parseInt(process.argv[2]);
    var allClipIDs = JSON.parse(base64url.decode(process.argv[3]));
    var downloadID = parseInt(process.argv[4]);

    return cb([userID, allClipIDs, downloadID]);
  }
}

// Determine what the origin path is depending on the environment
var staticOriginPath = "/home/ec2-user/Documents/youtube-video-automator/";
if (Attr.SERVER_ENVIRONMENT == "development") {
  staticOriginPath = "/Users/javinambridge/Documents/youtube-creator-bot/youtube-video-automator/";
}

global.ORIGIN_PATH = staticOriginPath;
cLogger.info("The global path is: " + ORIGIN_PATH);

// Initialize Sentry
Sentry.init({ 
  dsn: Secrets.SENTRY_DSN,
  release: Attr.RELEASE_VERSION
});

// Global Sentry init
Sentry.configureScope((scope) => {
  scope.setTag("scope", "batch-job");
  scope.setTag("environment", "encoding-batch-job");
});
global.Sentry = Sentry;

return knexConnection(function(validKnex) {
  if (validKnex == undefined) {
    Sentry.captureException(new Error("Cannot connect to DB."));
    process.exit(1);
  }

  global.knex = validKnex;

  return parseAndValidateArguments(function(validParameters) {
    if (validParameters == undefined) {
      ErrorHelper.scopeConfigure("batch-job.parseAndValidateArguments", {
        arguments: JSON.stringify(process.argv)
      });
      Sentry.captureException(new Error("Invalid Parameters passed to batch job."));
      process.exit(1);
    }

    let userID = validParameters[0];
    let allClipsID = validParameters[1];
    let downloadID = validParameters[2];

    cLogger.info("Done setup. Starting process for user (" + userID + ") and download (" + downloadID + ").");
    return Helpers.initVideoProcessingBatchJob(userID, downloadID)
    .then(function(extraNeededInfo) {
      let pmsID = extraNeededInfo[0];
      let intro = extraNeededInfo[1];
      let outro = extraNeededInfo[2];

      cLogger.info("Going to run the following: startVideoProcessing(" + userID + ", " + pmsID + ", " + downloadID + ", " + JSON.stringify(allClipsID) + ", " + JSON.stringify(intro) + ", " + JSON.stringify(outro) + ");");
      return Helpers.startVideoProcessing(userID, pmsID, downloadID, allClipsID, intro, outro);
    })
    .then(function() {
      process.exit(0);
    })
    .catch(function(err) {
      Sentry.captureException(err);
      cLogger.error(err);
      process.exit(1);
    });
  });
});
