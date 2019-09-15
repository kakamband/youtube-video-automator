exports.up = function(knex, Promise) {
    return knex.schema.table('emails', function(t) {
		t.string("message_id");
		t.string("request_id");
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('emails', function(t) {
        t.dropColumn('message_id');
        t.dropColumn('request_id');
    });
};