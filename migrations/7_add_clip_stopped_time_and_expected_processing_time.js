exports.up = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
		t.date("clip_stopped_downloading");
		t.date("expected_processing_time");
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('downloads', function(t) {
        t.dropColumn('clip_stopped_downloading');
        t.dropColumn('expected_processing_time');
    });
};