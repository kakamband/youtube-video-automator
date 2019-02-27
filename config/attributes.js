var LocalAttr = require('./local_attributes.js'); // Fill out this file with your local attributes

module.exports = {
	PG_CONNECTION_STR: process.env.DATABASE_URL || LocalAttr.PG_CONNECTION,
	POLLED_GAMES: LocalAttr.POLLED_GAMES || [],
	MIN_V_LENGTH: LocalAttr.MIN_VIDEO_LENGTH,
	MAX_V_LENGTH: LocalAttr.MAX_VIDEO_LENGTH,
	FINISHED_FNAME: LocalAttr.FINISHED_FILE_NAME || "finished",
	ENCODING_SPEED: LocalAttr.VIDEO_PROCESSING_SPEED || "medium"
};