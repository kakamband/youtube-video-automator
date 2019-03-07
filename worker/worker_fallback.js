#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
var Attr = require('../config/attributes');
var Secrets = require('../config/secrets');
var cLogger = require('color-log');
var Helpers = require('./worker_helpers');
var shell = require('shelljs');
var retriesMap = new Map();

function errMsg(workerActivity, ackMsg, queueMessage, err) {
  /*Sentry.withScope(scope => {
    scope.setTag("scope", "server-worker");
    scope.setTag("environment", Attr.ENV);
    scope.setTag("activity", workerActivity);
    scope.setExtra("AckMsg", ackMsg);
    scope.setExtra("QueueMsg", queueMessage);

    Sentry.captureException(err);
  });*/
  console.log("[ERRORED] (" + workerActivity + "): ", err);
}

function successMsg(message) {
  cLogger.mark("[x] Done (" + message + ")");
}

function safeRetry(workerActivity, ch, msg, message) {
  if (retriesMap[message] != null && retriesMap[message] > 10) {
    console.log("[Failure] The message (" + message + ") has failed too many times.");

    /*Sentry.withScope(scope => {
      scope.setTag("scope", "server-worker");
      scope.setTag("environment", Attr.ENV);
      scope.setTag("activity", workerActivity);
      scope.setExtra("AckMsg", msg);
      scope.setExtra("QueueMsg", message);

      Sentry.captureMessage("Losing a message in the queue! Very Dangerous!");
    });*/

    retriesMap[message] = null;
    ch.ack(msg);
    return;
  }

  if (retriesMap[message] == null) {
    retriesMap[message] = 0;
  }

  console.log("Retrying this message (" + message + ")");
  ch.ack(msg);
  ch.sendToQueue(Attr.DOWNLOADING_AMQP_CHANNEL_NAME, new Buffer(message), msg.properties);
  retriesMap[message] = retriesMap[message] + 1;
}

function knexConnection() {
  var dbConnection = {
    host: Attr.PG_CONNECTION_HOST,
    database: Attr.PG_CONNECTION_DB_NAME
  };

  if (Attr.PG_REQ_USER) {
    dbConnection.user = Attr.PG_USER_NAME;
    dbConnection.password = Attr.PG_USER_PASSWORD;
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
  switch (message) {
    case "downloading_task":
      var userID = msg.properties.correlationId;
      var gameName = msg.properties.contentType;
      var twitchStream = msg.properties.contentEncoding;
      var downloadID = parseInt(msg.properties.messageId);
      cLogger.info("Starting a downloading task.");

      return Helpers.downloadContent(userID, gameName, twitchStream, downloadID)
      .then(function() {
        successMsg(message);
        ch.ack(msg);
      }).catch(function(err) {
        errMsg(message, msg, message, err);
        safeRetry(message, ch, msg, message);
      });
    break;
  }
}

shell.cd("..");
global.ORIGIN_PATH = (shell.pwd() + "/");
cLogger.info("The global path is: " + ORIGIN_PATH);

amqp.connect(Attr.RABBITMQ_CONNECTION_STR, function(err, conn) {
  conn.createChannel(function(err, ch) {

    // Initialize sentry
    //Sentry.init({ dsn: Secrets.sentry_dsn });

    ch.assertQueue(Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME, {durable: true, maxPriority: 10});
    ch.prefetch(1);
    console.log("[*] Waiting for messages in %s. To exit press CTRL+C", Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME);
    var knex = knexConnection();
    global.knex = knex;
    ch.consume(Attr.FINAL_FALLBACK_AMQP_CHANNEL_NAME, function(msg) {
      var secs = msg.content.toString().split('.').length - 1;

      var contentMsg = msg.content.toString();
      handleMessage(contentMsg, msg, ch, knex);
    }, {noAck: false});
  });
});