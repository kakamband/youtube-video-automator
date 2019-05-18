exports.up = function(knex, Promise) {
    return knex.schema.table('youtube_videos', function(t) {
		t.integer("video_number").notNullable();
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('youtube_videos', function(t) {
        t.dropColumn('video_number');
    });
};