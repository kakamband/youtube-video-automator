exports.up = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
		t.integer("video_number");
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
        t.dropColumn('video_number');
    });
};