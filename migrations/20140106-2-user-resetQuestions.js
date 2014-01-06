// TODO: Later we'll remove this, but at startup, do the expensive work of checking whether a user hasAnsweredAllRequiredQuestions
var mongoose = require('mongoose')
  , Migration = mongoose.model('Migration')
  , migrationName = '20140106-2-user-resetQuestions';
Migration.doIfNotExists(migrationName, function(){
	var User = mongoose.model('User');
	User.reCheckAllUsersProfileQuestions(function(){
		Migration.createMigration(migrationName, 'done', function(saveErr){
			if(saveErr){
				console.log('Error saving migration: ', saveErr);
			}
			console.log('did finish importing old confessions.');
		});
	});
});