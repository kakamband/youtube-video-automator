exports.up = function(knex, Promise) {
    return knex.schema.createTable('worker_capacity', function(table) {
        table.increments();
        table.string("name").notNullable();
        table.integer("currently_working").unsigned().notNullable().default(0);
        table.integer("currently_running").unsigned().notNullable();
        table.timestamps();
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('worker_capacity');
};