var mongoose = require('mongoose'),
	db = require('./db'),
	fs = require('fs'),
	util = require('util'),
	auth = require('./auth'),
	async = require('async');

// Models
var dir = __dirname + '/models';
// grab a list of our route files
fs.readdirSync(dir).forEach(function(file){
	require('./models/'+file);
});


var Experimonth = mongoose.model('Experimonth');
var Notification = mongoose.model('Notification');
Experimonth.findActiveQuery().populate('users').exec(function(err, experimonths){
	if(experimonths && experimonths.length){
		// Iterate over every experimonth...
		async.each(experimonths, function(experimonth, experimonthCallback){
			if(experimonth.users && experimonth.users.length){
				var fillInAdmin = null;
				// If this experimonth has users...
				async.each(experimonth.users, function(user, userCallback){
					// Check each user to determine if they've filled out the required questions
					if(!user.hasAnsweredAllRequiredQuestions){
						// This user hasn't filled out all their questions. So, we've got to notify them
						console.log('Notifying this player that they were excluded due to not filling out their questions.', user._id);
						Notification.notify('info', null, 'Uh oh! You can\'t play '+experimonth.name+' yet.', 'It appears you\'ve enrolled in '+experimonth.name+', but you haven\'t answered all the questions required in order to play. Please visit '+process.env.BASEURL+'/profile and answer the remaining required questions to get the game started.\n\nAs soon as you do this, you\'ll be added to '+experimonth.name+' at midnight the following day.\n\nThanks!\nThe Experimonth Team', user, function(err, notification){
							userCallback();
						});
						return;
					}

					userCallback();
				}, function(err){
					experimonthCallback();
				});
				return;
			}

			experimonthCallback();
		}, function(err){
			// Done iterating over experimonths!

			// Wait 10s just to make sure everything has saved
			setTimeout(function(){
				process.exit(0);
			}, 10000);
		});
		return;
	}

	process.exit(0);
});



