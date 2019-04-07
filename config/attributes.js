var LocalAttr = require('./local_attributes.js'); // Fill out this file with your local attributes

module.exports = {
	RELEASE_VERSION: "0.0.6",
	ENCODING_AMQP_CHANNEL_NAME: "ENCODING_CHANNEL_NO_EXP",
	UPLOADING_AMQP_CHANNEL_NAME: "UPLOADING_CHANNEL_NO_EXP",
	DOWNLOADING_AMQP_CHANNEL_NAME: "DOWNLOADING_CHANNEL_NO_EXP",
	FINAL_FALLBACK_AMQP_CHANNEL_NAME: "FALLBACK_CHANNEL_NO_EXP",
	SERVER_ENVIRONMENT: LocalAttr.ENV || "development",
	PG_CONNECTION_HOST: process.env.DATABASE_URL || LocalAttr.PG_CONNECTION,
	PG_CONNECTION_DB_NAME: process.env.DATABASE_NAME || LocalAttr.PG_DATABASE_NAME,
	PG_CONNECTION_PORT: process.env.PG_CONNECTION_PORT || LocalAttr.PG_CONNECTION_PORT,
	FINAL_FALLBACK_NO_CONSUMERS_FOR_DWNLOAD: LocalAttr.FINAL_FALLBACK_NO_CONSUMERS_AVAILABLE || "echo 'no fallback defined.'",
	PG_REQ_USER: LocalAttr.PG_USER_REQ || false,
	PG_USER_NAME: LocalAttr.PG_USER_NAME || "",
	PG_USER_PASSWORD: LocalAttr.PG_USER_PASSWORD || "",
	REDIS_HOST: LocalAttr.REDIS_HOST || "127.0.0.1",
	REDIS_PORT: LocalAttr.REDIS_PORT || 6379,
	RABBITMQ_CONNECTION_STR: process.env.RABBITMQ_URL || LocalAttr.RABBITMQ_CONNECTION,
	POLLED_GAMES: LocalAttr.POLLED_GAMES || [],
	VIDEO_VISIBILITY: LocalAttr.VID_VISIBILITY || "private",
	VIDEO_CATEGORY: LocalAttr.VID_CATEGORY || "20",
	VIDEO_LANGUAGE: LocalAttr.VID_LANGUAGE || "en",
	MIN_V_LENGTH: LocalAttr.MIN_VIDEO_LENGTH || 420,
	MAX_V_LENGTH: LocalAttr.MAX_VIDEO_LENGTH || 650,
	FINISHED_FNAME: LocalAttr.FINISHED_FILE_NAME || "finished",
	ENCODING_SPEED: LocalAttr.VIDEO_PROCESSING_SPEED || "medium",
	VIDEO_DESCR: LocalAttr.DEFAULT_VIDEO_DESCRIPTION || "",
	VIDEO_TITLE: LocalAttr.DEFAULT_VIDEO_TITLE || "Highlights - Ep.",
	DEFAULT_TAGS_MAP: LocalAttr.DEFAULT_TAGS,
	DEFAULT_LIKE_SUB_TEXT: LocalAttr.DEFAULT_LIKE_SUB_TEXT || "",
	ADD_DEFAULT_COMMENT: LocalAttr.MAKE_DEFAULT_COMMENT || false,
	DEFAULT_COMMENT_TEXT: LocalAttr.DEFAULT_COMMENT_TEXT || new Map(),
	AWS_S3_BUCKET_NAME: LocalAttr.AWS_S3_BUCKET_NAME || "tmp/",
	AWS_S3_BUCKET_VIDEO_PATH: LocalAttr.AWS_S3_BUCKET_VIDEO_PATH || "tmp/"
};