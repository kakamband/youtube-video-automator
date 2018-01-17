var lastBuyNum = undefined;
var actioner = require('./btc-actions');

module.exports.Watch = function(message, client) {
	var update = JSON.parse(message);
	switch (update.side) {
		case "buy":
			this.buyWatch(update, client);
			break;
		case "sell":
			this.sellWatch(update, client);
			break;
	}
	//console.log(update.price);
};

module.exports.buyWatch = function(update, client) {
	if (lastBuyNum == undefined) {
		lastBuyNum = update.price;
	} else {
		if (lastBuyNum == update.price) return;
		lastBuyNum = update.price;
	}

	var date = new Date(update.time);
	// test buy
	actioner.Buy(client, update.price);
};

module.exports.sellWatch = function(update, client) {

};
