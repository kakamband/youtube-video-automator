var Promise = require('bluebird');
var Attributes = require('../config/attributes');
var cLogger = require('color-log');

module.exports.initialize = function(knex) {
	var oldLogger = console.log;

	return new Promise(function(resolve, reject) {
		return knex.migrate.latest()
		.then(function() {
			cLogger.info("Completed all migrations.");

			// Hide output here (fuck seeing these warnings)
			console.log = function() {};

			return resolve();
		}).catch(function(err) {
			return reject(err);
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('used_content', function(table) {
			table.increments();
			table.string("pms_user_id");
			table.string("game").notNullable();
			table.string("vod_id").notNullable();
			table.string("tracking_id").notNullable();
			table.string("clip_url").notNullable();
			table.string("title").notNullable();
			table.integer("views");
			table.string("duration").notNullable();
			table.string("clip_created_at").notNullable();
			table.string("clip_channel_name").notNullable();
			table.string("vod_url").notNullable();
			table.timestamps();
		}).then(function() {
			return Promise.resolve();
		}).catch(function(err) {
			// Need to do this because of this bug: https://github.com/tgriesser/knex/issues/322
			return Promise.resolve();
		})
	}).then(function() {
		return knex.schema.createTableIfNotExists('youtube_videos', function(table) {
			table.increments();
			table.string("user_id").notNullable();
			table.string("game").notNullable();
			table.string("url").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('user_tokens', function(table) {
			table.increments();
			table.string("user_id").notNullable();
			table.string("client_id").notNullable();
			table.string("access_token").notNullable();
			table.string("refresh_token").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('playlists', function(table) {
			table.increments();
			table.string("user_id").notNullable();
			table.string("game").notNullable();
			table.string("playlist_id").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('thumbnails', function(table) {
			table.increments();
			table.string("user_id").notNullable();
			table.string("game").notNullable();
			table.string("image_name").notNullable();
			table.boolean("hijacked").default(false);
			table.string("hijacked_name");
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('downloads', function(table) {
			table.increments();
			table.string("game").notNullable();
			table.string("user_id").notNullable();
			table.string("state").default("started").notNullable();
			table.string("twitch_link").notNullable();
			table.string("downloaded_file");
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('users', function(table) {
			table.increments();
			table.string("username").notNullable();
			table.string("pms_user_id").notNullable();
			table.string("email").notNullable();
			table.string("password").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('defined_subscriptions', function(table) {
			table.string("subscription_id").notNullable();
			table.boolean("active").default(false).notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('user_subscriptions', function(table) {
			table.increments();
			table.string("pms_user_id").notNullable();
			table.string("subscription_id").notNullable();
			table.string("status").notNullable();
			table.date("start_date").notNullable();
			table.string("payment_profile_id");
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('payments', function(table) {
			table.increments();
			table.string("pms_user_id").notNullable();
			table.string("subscription_id").notNullable();
			table.string("amount").notNullable();
			table.string("status").notNullable();
			table.date("date").notNullable();
			table.string("payment_gateway").notNullable();
			table.string("transaction_id");
			table.string("ip_address");
			table.timestamps();
		});
	}).then(function() {
		console.log = oldLogger;
		cLogger.info("Succesfully setup tables!\n");
		return Promise.resolve();
	}).catch(function(err) {
		console.log = oldLogger;
		cLogger.error("UhOh errored out, err: ", err);
		return Promise.reject();
	});
}