var Promise = require('bluebird');
var Attributes = require('../config/attributes');
var cLogger = require('color-log');

module.exports.initialize = function(knex) {
	var oldLogger = console.log;

	return new Promise(function(resolve, reject) {
		console.log = function() {};

		return knex.schema.createTableIfNotExists('used_content', function(table) {
			table.increments();
			table.string("user_id");
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
			return resolve();
		}).catch(function(err) {
			// Need to do this because of this bug: https://github.com/tgriesser/knex/issues/322
			return resolve();
		})
	}).then(function() {
		return knex.schema.createTableIfNotExists('youtube_videos', function(table) {
			table.increments();
			table.string("user_id").notNullable();
			table.string("game").notNullable();
			table.string("url").notNullable();
			table.integer("video_number").notNullable();
			table.timestamps();
			table.string("thumbnail");
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
			table.string("pms_user_id").notNullable();
			table.string("game").notNullable();
			table.string("playlist_id").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('comments', function(table) {
			table.increments();
			table.string("pms_user_id").notNullable();
			table.string("game").notNullable();
			table.string("comment").notNullable();
			table.timestamps();
			table.string("comment_id");
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('signatures', function(table) {
			table.increments();
			table.string("pms_user_id").notNullable();
			table.string("game").notNullable();
			table.string("signature").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('tags', function(table) {
			table.increments();
			table.string("pms_user_id").notNullable();
			table.string("game").notNullable();
			table.string("tag").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('thumbnails', function(table) {
			table.increments();
			table.string("pms_user_id").notNullable();
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
			table.boolean("used").default(false).notNullable();
			table.boolean("exclusive").default(false).notNullable();
			table.string("twitch_link").notNullable();
			table.string("downloaded_file");
			table.boolean("deleted").default(false).notNullable();
			table.date("deleted_at");
			table.integer("order_number").default(-1).notNullable();
			table.integer("clip_seconds");
			table.string("clip_stopped_downloading");
			table.string("expected_processing_time");
			table.integer("video_number");
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
			table.boolean("currently_processing").default(false).notNullable();
			table.string("channel_id");
			table.boolean("banned").default(false).notNullable();
			table.string("banned_reason");
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('defined_subscriptions', function(table) {
			table.increments();
			table.string("subscription_id").notNullable();
			table.string("price").notNullable();
			table.integer("uploads").notNullable();
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
		return knex.schema.createTableIfNotExists('notifications', function(table) {
			table.increments();
			table.string("pms_user_id").notNullable();
			table.string("notification").notNullable();
			table.boolean("seen").default(false).notNullable();
			table.string("content");
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('simple_default', function(table) {
			table.increments();
			table.string("pms_user_id").notNullable();
			table.string("setting_name").notNullable();
			table.string("value").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('descriptions', function(table) {
			table.increments();
			table.string("user_id").notNullable();
			table.string("download_id").notNullable();
			table.string("value").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('titles', function(table) {
			table.increments();
			table.string("user_id").notNullable();
			table.string("download_id").notNullable();
			table.string("value").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('placebo_user', function(table) {
			table.increments();
			table.string("user_id").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('custom_options', function(table) {
			table.increments();
			table.string("user_id").notNullable();
			table.string("download_id").notNullable();
			table.string("option_name").notNullable();
			table.string("option_value").notNullable();
			table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('worker_capacity', function(table) {
	        table.increments();
	        table.string("name").notNullable();
	        table.integer("currently_working").unsigned().notNullable().default(0);
	        table.integer("currently_running").unsigned().notNullable();
	        table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('need_to_be_deleted', function(table) {
	        table.increments();
	        table.string("download_id").notNullable();
	        table.string("cant_delete_before").notNullable();
	        table.boolean("deleted").notNullable().default(false);
	        table.timestamps();
		});
	}).then(function() {
		return knex.schema.createTableIfNotExists('intros_or_outros', function(table) {
	        table.increments();
	        table.string("user_id").notNullable();
	        table.string("pms_user_id").notNullable();
	        table.string("game").notNullable();
	        table.string("intro_or_outro").notNullable();
	        table.string("file_location").notNullable();
	        table.integer("uses").unsigned().notNullable().default(0);
	        table.boolean("finished_uploading").notNullable().default(false);
	        table.string("nonce");
	        table.timestamps();
		});
	}).then(function() {
		return knex.migrate.latest()
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