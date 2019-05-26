exports.up = function(knex, Promise) {
    return knex.schema.table('youtube_videos', function(t) {
		t.string("thumbnail");
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('youtube_videos', function(t) {
        t.dropColumn('thumbnail');
    });
};