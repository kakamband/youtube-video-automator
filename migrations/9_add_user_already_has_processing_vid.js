exports.up = function(knex, Promise) {
    return knex.schema.table('users', function(t) {
		t.boolean("currently_processing").default(false).notNullable();
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('users', function(t) {
        t.dropColumn('currently_processing');
    });
};