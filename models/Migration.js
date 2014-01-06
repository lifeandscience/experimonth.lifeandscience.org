var mongoose = require('mongoose')
  , util = require('util')
  , Schema = mongoose.Schema;

var MigrationSchema = new Schema({
    name: String
  , value: String
  , updated: {type: Number, default: 0}
}, { strict: true });

MigrationSchema.pre('save', function(next){
	this.updated = Date.now();
	next();
});

MigrationSchema.static('createMigration', function(name, value, callback){
	var newMigration = new Migration();
	newMigration.name = name;
	newMigration.value = value;
	newMigration.save(callback);
});
MigrationSchema.static('doIfNotExists', function(name, callback){
	Migration.count({name: name}).exec(function(err, migrationCount){
		if(!migrationCount){
			callback();
		}
	});
});

var Migration = mongoose.model('Migration', MigrationSchema);

exports = Migration;
