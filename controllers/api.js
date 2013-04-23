var auth = require('../auth')
  , mongoose = require('mongoose')
  , Experimonth = mongoose.model('Experimonth')
  , ExperimonthKind = mongoose.model('ExperimonthKind')
  , ProfileQuestion = mongoose.model('ProfileQuestion')
  , ProfileAnswer = mongoose.model('ProfileAnswer')
  , User = mongoose.model('User');

module.exports = function(app){
	app.get('/api/1/experimonths/activeByKind/:id', auth.clientAuthorize, function(req, res){
		// Get a list of all users enrolled in this experimonth
		if(!req.param('id')){
			res.json(400, {'error': 'Missing Experimonth ID.'});
			return;
		}
		User.randomAdmin(function(err, randomAdmin){
			ExperimonthKind.findById(req.param('id')).exec(function(err, experimonthKind){
				if(err || !experimonthKind){
					return res.json(400, {'error': 'Experimonth Kind not found.'});
				}
	
				Experimonth.findActiveQuery().where('kind').equals(req.param('id')).populate('users').populate('conditions').exec(function(err, experimonths){
					// TODO: We should iterate over all users and ensure that they've answered the appropriate number of conditions (ProfileQuestions)
					
					// Check all the users to determine if they have their profiles complete.
					ProfileQuestion.count({
						published: true
					  , required: true
					}).exec(function(err, numRequiredQuestions){
						if(err){
							console.log('error retrieving questions: ', arguments);
							next();
							return;
						}
						if(experimonths && experimonths.length){
							// Iterate over every experimonth...
							experimonths.forEach(function(experimonth, index){
								if(experimonth.users && experimonth.users.length){
									var fillInAdmin = null;
									// If this experimonth has users...
									for(var i=experimonth.users.length-1; i>=0; i--){
										var user = experimonth.users[i];
										// Check each user to determine if they've filled out the required questions
										if(user.requiredAnswers.length != numRequiredQuestions){
											// This user hasn't filled out all their questions. So, we've got to exclude them from play.
											// TODO: Notify the player that they've been skipped from playing because their profile is incomplete?
											console.log('this player was excluded due to not filling out their questions!', user._id);
											experimonth.users.splice(i, 1);
										}else if(!fillInAdmin && user.role >= 10){
											// Find an enrolled admin
											fillInAdmin = user;
										}
									}
									if(!fillInAdmin){
										fillInAdmin = randomAdmin;
									}
									experimonth.fillInAdmin = fillInAdmin;
								}
							});
						}
						
						return res.json(experimonths);
					});
				});
			});
		});
	});
	
	app.get('/api/1/profile/answerForUserAndQuestion/:userID/:questionID', auth.clientAuthorize, function(req, res){
		if(!req.param('userID')){
			res.json(400, {'error': 'Missing User ID.'});
			return;
		}
		if(!req.param('questionID')){
			res.json(400, {'error': 'Missing Question ID.'});
			return;
		}
		ProfileAnswer.find({
			user: req.param('userID')
		  , question: req.param('questionID')
		}).exec(function(err, answers){
			if(err){
				res.json(400, {'error': err});
				return;
			}
			if(!answers || answers.length == 0){
				res.json(null);
				return;
			}
			res.json(answers[0]);
		});
		
	});
};