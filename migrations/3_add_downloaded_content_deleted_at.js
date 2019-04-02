exports.up = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
		t.date("deleted_at");
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
        t.dropColumn('deleted_at');
    });
};