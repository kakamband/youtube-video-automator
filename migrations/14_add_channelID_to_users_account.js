exports.up = function(knex, Promise) {
    return knex.schema.table('users', function(t) {
		t.string("channel_id");
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('users', function(t) {
        t.dropColumn('channel_id');
    });
};