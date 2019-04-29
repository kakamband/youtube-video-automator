exports.up = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
		t.integer("clip_seconds");
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
        t.dropColumn('clip_seconds');
    });
};