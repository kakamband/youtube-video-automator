// Define games here. These names are the Twitch specific names.
// So to add a new game look at the twitch game gallery and find the name and enter it.
var DefinedGames = {
	FORTNITE: "Fortnite",
	LEAGUE_OF_LEGENDS: "League of Legends",
	APEX_LEGENDS: "Apex Legends"
};

module.exports = {
	PG_CONNECTION: 'ENTER YOUR POSTGRESQL DATABASE URL HERE',
	POLLED_GAMES: [
		// ADD THE GAMES YOU WANT TO POLL HERE
		// DefinedGames.FORTNITE
	],
	MAX_VIDEO_LENGTH: 650, // WHAT IS THE MAX VIDEO LENGTH IN SECONDS
	MIN_VIDEO_LENGTH: 420, // WHAT IS THE MIN VIDEO LENGTH IN SECONDS
	FINISHED_FILE_NAME: "ENTER THE FILE NAME FOR FINISHED COMBINATION VIDEOS. DO NOT INCLUDE A FILE TYPE! (EXAMPLE: 'finished')",

	// SPECIFIES HOW FAST TO ENCCODE THE VIDEO. 'medium' is pretty high quality.
	// The possible values are: 'ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'veryslow'
	// The faster the processing, the lower the quality. The slower the processing, the better the quality.
	VIDEO_PROCESSING_SPEED: "medium",
	DEFAULT_VIDEO_DESCRIPTION: "ADD A DEFAULT VIDEO DESCRIPTION FOR ALL OF YOUR VIDEOS HERE",

	// Example: 'Highlights - Ep.' will result in a title of 'GAME_NAME Highlights - Ep.EPISODE_COUNT'.
	DEFAULT_VIDEO_TITLE: "ADD A DEFAULT VIDEO TITLE. TO THE LEFT OF THE TITLE WILL BE THE GAME NAME AND TO THE RIGHT THE EPISODE NUMBER",

	// Default Attributes to apply to videos of certain games
	DEFAULT_TAGS: new Map([
		[
			"Fortnite", [
				"esports",
				// ADD MORE TAGS FOR FORTNITE HERE
			]
		],
		// ADD MORE GAMES WITH TAGS HERE
	]),

	// Default text to ask for a like and subscribe
	DEFAULT_LIKE_SUB_TEXT: "Please give a like if you enjoyed, and subscribe for more content! Thanks :)"
};