module.exports.DEV_ENV = process.env.ENVIRONMENT || "development";

module.exports.subscribe = function() {
	return {
	    "type": "subscribe",
	    "product_ids": [
	        "BTC-USD"
	    ],
	    "channels": [
	        "ticker"
	    ]
	};
}();

module.exports.url = function() {
	/*if ((process.env.ENVIRONMENT || "development") == "development") {
		return 'wss://ws-feed-public.sandbox.gdax.com';
	}*/
	return 'wss://ws-feed.gdax.com';
}();

module.exports.authUrl = function() {
	if ((process.env.ENVIRONMENT || "development") == "development") {
		return 'https://api-public.sandbox.gdax.com';
	}
	return '';
}();
