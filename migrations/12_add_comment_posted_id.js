exports.up = function(knex, Promise) {
    return knex.schema.table('comments', function(t) {
		t.string("comment_id");
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('comments', function(t) {
        t.dropColumn('comment_id');
    });
};