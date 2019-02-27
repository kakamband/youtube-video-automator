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
};