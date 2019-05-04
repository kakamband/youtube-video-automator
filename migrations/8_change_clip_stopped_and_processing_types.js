exports.up = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
		t.string("clip_stopped_downloading").alter();
		t.string("expected_processing_time").alter();
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
        t.dropColumn('clip_stopped_downloading');
        t.dropColumn('expected_processing_time');
    });
};