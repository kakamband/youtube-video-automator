exports.up = function(knex, Promise) {
	return knex('defined_subscriptions').insert([
	    {
	      id: 1,
	      subscription_id: '667', // Basic
	      price: '0.00',
	      uploads: 1,
	      active: true,
	      created_at: new Date(),
	      updated_at: new Date()
	    },
	    {
	      id: 2,
	      subscription_id: '715', // Casual
	      price: '6.99',
	      uploads: 20,
	      active: true,
	      created_at: new Date(),
	      updated_at: new Date()
	    },
	    {
	      id: 3,
	      subscription_id: '716', // Professional
	      price: '19.99',
	      uploads: 45,
	      active: true,
	      created_at: new Date(),
	      updated_at: new Date()
	    }
	]);
}

exports.down = function(knex, Promise) {
	return knex("defined_subscriptions")
	.whereIn("id", [1, 2, 3])
	.del();
}