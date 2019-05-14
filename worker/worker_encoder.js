#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
var Attr = require('../config/attributes');
var Secrets = require('../config/secrets');
var cLogger = require('color-log');
var Helpers = require('./worker_helpers');
var shell = require('shelljs');
var redis = require('redis');
var retriesMap = new Map();
const Sentry = require('@sentry/node');
var MessageHandler = require('./worker_function_wrappers');
const redisEncodingKey = "encoding_queue_msg_count";

function knexConnection() {
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

  console.log("Trying Postgres connection...");
  knex.raw('select 1+1 as result').then(function() {
    console.log("Did connect succesfully to db.");
  }).catch(function() {
    console.log("Did not connect succesfully.");
  });

  return knex;
}

function handleMessage(message, msg, ch, knex) {
  return MessageHandler.handleMessage(ch, message, msg, "encoder");
}

global.ORIGIN_PATH = (shell.pwd() + "/");
cLogger.info("The global path is: " + ORIGIN_PATH);

var redisClient = redis.createClient({
  host: Attr.REDIS_HOST,
  port: Attr.REDIS_PORT
});

global.redis = redisClient;

// Initialize Sentry
Sentry.init({ 
  dsn: Secrets.SENTRY_DSN,
  release: Attr.RELEASE_VERSION
});

// Global Sentry init
Sentry.configureScope((scope) => {
  scope.setTag("scope", "server-worker");
  scope.setTag("environment", Attr.SERVER_ENVIRONMENT);
});
global.Sentry = Sentry;

Helpers.setupWorkerChannels()
.then(function() {
  amqp.connect(Attr.RABBITMQ_CONNECTION_STR, function(err, conn) {
    conn.createChannel(function(err, ch) {

      // Initialize sentry
      //Sentry.init({ dsn: Secrets.sentry_dsn });

      ch.assertQueue(Attr.ENCODING_AMQP_CHANNEL_NAME, {durable: true, maxPriority: 10});
      ch.prefetch(1);
      console.log("[*] Waiting for messages in %s. To exit press CTRL+C", Attr.ENCODING_AMQP_CHANNEL_NAME);
      var knex = knexConnection();
      global.knex = knex;

      // Handle initializations and shutdowns gracefully
      Helpers.handleGracefulInitAndShutdown("encoder");

      ch.consume(Attr.ENCODING_AMQP_CHANNEL_NAME, function(msg) {
        var secs = msg.content.toString().split('.').length - 1;

        var contentMsg = msg.content.toString();
        handleMessage(contentMsg, msg, ch, knex);
      }, {noAck: false});
    });
  });
})
.catch(function(err) {
  Sentry.withScope(scope => {
    scope.setTag("scope", "server-worker-encoder");
    scope.setTag("environment", Attr.ENV);

    Sentry.captureException(err);
  });
});