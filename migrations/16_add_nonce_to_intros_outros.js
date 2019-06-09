exports.up = function(knex, Promise) {
    return knex.schema.table('intros_or_outros', function(t) {
		t.string("nonce");
		t.boolean("finished_uploading").notNullable().default(false);
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('intros_or_outros', function(t) {
        t.dropColumn('nonce');
        t.dropColumn('finished_uploading');
    });
};