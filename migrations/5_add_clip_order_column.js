exports.up = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
		t.integer("order_number").default(-1).notNullable();
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
        t.dropColumn('order_number');
    });
};