exports.up = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
		t.boolean("deleted").default(false).notNullable();
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
        t.dropColumn('deleted');
    });
};