
// Load the confessions.js dump from Frenemy and make sure it's imported.
var oldConfessions = require('../bin/confessions.json');
if(oldConfessions){
	var mongoose = require('mongoose')
	  , Migration = mongoose.model('Migration');
	Migration.doIfNotExists('20131231-confession-frenemy-import', function(){
		var Confession = mongoose.model('Confession');
		Confession.count(function(err, count){
			console.log(count, ' existing confessions');
			var i = 1
			  , async = require('async');
			async.eachSeries(oldConfessions, function(confession, callback){
				Confession.find({_oldID: confession._id['$oid']}).exec(function(err, foundConfessions){
					// If there's an error, bail!
					if(err){
						return callback(err);
					}
					// If this confession has already been imported, don't reimport!
					if(foundConfessions.length){
						return callback();
					}
	
					// Create a new confession and copy the data in!
					var newConfession = new Confession();
					newConfession.number = count + i++;
					newConfession.active = confession.active;
					newConfession._oldID = confession._id['$oid'];
					newConfession.date = new Date(confession.date['$date']);
					newConfession.text = confession.text;
					newConfession.save(function(err){
						callback(err);
					});
				});
			}, function(err){
				Migration.createMigration('20131231-confession-frenemy-import', 'done', function(saveErr){
					if(saveErr){
						console.log('Error saving migration: ', saveErr);
					}
					console.log('did finish importing old confessions.', err);
				});
			});
		});
	});
}