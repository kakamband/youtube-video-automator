exports.up = function(knex, Promise) {
    return knex.schema.table('users', function(t) {
		t.boolean("banned").default(false).notNullable();
		t.string("banned_reason");
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('users', function(t) {
        t.dropColumn('banned');
        t.dropColumn('banned_reason');
    });
};