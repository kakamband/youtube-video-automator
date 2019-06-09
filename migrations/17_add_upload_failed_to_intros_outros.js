exports.up = function(knex, Promise) {
    return knex.schema.table('intros_or_outros', function(t) {
		t.boolean("upload_failed").notNullable().default(false);
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('intros_or_outros', function(t) {
        t.dropColumn('upload_failed');
    });
};