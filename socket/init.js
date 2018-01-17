var Attr = require('../config/socket-attributes');
var BTC = require('./btc-observer');

module.exports.Init = function(ws, client) {
	ws.on('open', function open() {
	  ws.send(JSON.stringify(Attr.subscribe));
	});

	ws.on('message', function incoming(data) {
		BTC.Watch(data, client);
	});
}