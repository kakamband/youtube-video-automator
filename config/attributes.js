var LocalAttr = require('./local_attributes.js'); // Fill out this file with your local attributes

module.exports = {
	PG_CONNECTION_STR: process.env.DATABASE_URL || LocalAttr.PG_CONNECTION,
	POLLED_GAMES: LocalAttr.POLLED_GAMES || [],
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
};