module.exports.Buy = function(client, price) {
	var amountToBuy = 150; // 150USD
	var priceFloat = parseFloat(price);
	var amountGetting = amountToBuy / priceFloat;
    
    var buyOrder = {
      side: 'buy',
      price: price,
      size: amountGetting.toFixed(8),
      time_in_force: "FOK",
      product_id: 'BTC-USD',
      type: 'limit',
    };

	client.placeOrder(buyOrder, (err, resp, data) => {
		if (err) {
			console.log("something went wrong uhoh");
			return;
		}
		console.log("Placed order for " + data.size + " BTC at $" + data.price);
	});
};