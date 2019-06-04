module.exports.getSubInfo = function() {
	return new Map([
		["667", {
			name: "Basic",
			videos_allowed: 1,
			per_month: false,
			can_purchase_more: false,
			more_purchase_price: -1
		}],
		["715", {
			name: "Casual",
			videos_allowed: 20,
			per_month: true,
			can_purchase_more: true,
			more_purchase_price: 2
		}],
		["716", {
			name: "Professional",
			videos_allowed: 45,
			per_month: true,
			can_purchase_more: true,
			more_purchase_price: 1
		}],
	])
}

module.exports.getHardcodedSubscriptions = function() {
	return [
		{ // Javin's developer account
			username: 'jmambrid',
			pms_id: 153618856,
			email: 'javin.ambridge@gmail.com', // May change
			subscription_id: "716"
		}
	];
}
