var auth = require('../auth')
  , mongoose = require('mongoose')
  , Experimonth = mongoose.model('Experimonth')
  , ExperimonthKind = mongoose.model('ExperimonthKind')
  , ProfileQuestion = mongoose.model('ProfileQuestion')
  , ProfileAnswer = mongoose.model('ProfileAnswer')
  , User = mongoose.model('User')
  , Notification = mongoose.model('Notification')
  , Event = mongoose.model('Event');

module.exports = function(app){

	// EXPERIMONTHS
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
/*
					ProfileQuestion.count({
						published: true
					  , required: true
					}).exec(function(err, numRequiredQuestions){
						if(err){
							console.log('error retrieving questions: ', arguments);
							next();
							return;
						}
*/
						if(experimonths && experimonths.length){
							// Iterate over every experimonth...
							experimonths.forEach(function(experimonth, index){
								if(experimonth.users && experimonth.users.length){
									var fillInAdmin = null;
									// If this experimonth has users...
									for(var i=experimonth.users.length-1; i>=0; i--){
										var user = experimonth.users[i];
										// Check each user to determine if they've filled out the required questions
/* 										console.log('checking this user: ', user.requiredAnswers.length, numRequiredQuestions); */
/* 										console.log(user.requiredAnswers); */
/* 										if(user.requiredAnswers.length != numRequiredQuestions){ */
										if(!user.hasAnsweredAllRequiredQuestions){
											// This user hasn't filled out all their questions. So, we've got to exclude them from play.
											// TODO: Notify the player that they've been skipped from playing because their profile is incomplete?
											console.log('this player was excluded due to not filling out their questions.', user._id);
											experimonth.users.splice(i, 1);
										}else if(!user.active){
											console.log('this player was excluded due to being de-activated.', user._id);
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
/* 					}); */
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
			if(err || !answers || answers.length == 0){
				return res.json(400, {'error': 'Error reading answers.', 'err': err, 'answers': answers});
			}
			res.json(answers[0]);
		});
		
	});


	// EVENTS
	app.get('/api/1/events/user/:userid', auth.clientAuthorize, function(req, res){
		var id = req.param('userid');
		if(!id){
			return res.json(400, {'error': 'Missing User ID.'});
		}
		Event.find({user: id}).exec(function(err, events){
			if(err || !events){
				return res.json(400, {'error': 'Error reading events.', 'err': err, 'events': events});
			}
			res.json(events);
		});
	});
	app.get('/api/1/events/experimonth/:emid', auth.clientAuthorize, function(req, res){
		var id = req.param('emid');
		if(!id){
			return res.json(400, {'error': 'Missing Experimonth ID.'});
		}
		Event.find({experimonth: id}).exec(function(err, events){
			if(err || !events){
				return res.json(400, {'error': 'Error reading events.', 'err': err, 'events': events});
			}
			res.json(events);
		});
	});
	app.get('/api/1/events/:userid/:emid', auth.clientAuthorize, function(req, res){
		var id = req.param('userid');
		if(!id){
			return res.json(400, {'error': 'Missing User ID.'});
		}
		var emid = req.param('emid');
		if(!emid){
			return res.json(400, {'error': 'Missing Experimonth ID.'});
		}
		Event.find({user: id, experimonth: emid}).exec(function(err, events){
			if(err || !events){
				return res.json(400, {'error': 'Error reading events.', 'err': err});
			}
			res.json(events);
		});
	});
	// Post a new event. Requires at least a valid User and Experimonth, but prefers to have:
	//	- client_id = ExperimonthKind (oAuth client) ID
	//	- name = the name of the event that occured, optionally namespaced using colons (e.g. 'frenemy:walkaway' or 'frenemy:walkedAwayFrom')
	//	- value = a value for the event. Could be something meaningful like the opponents user ID
	app.post('/api/1/events', auth.clientAuthorize, function(req, res){
		var id = req.body.user;
		if(!id){
			return res.json(400, {'error': 'Missing User ID.'});
		}
		var emid = req.body.experimonth;
		if(!emid){
			return res.json(400, {'error': 'Missing Experimonth ID.'});
		}
		Experimonth.findById(emid).exec(function(err, experimonth){
			if(err || !experimonth){
				return res.json(400, {'error': 'Experimonth doesn\'t exist.'});
			}
			User.findById(id).exec(function(err, user){
				if(err || !user){
					return res.json(400, {'error': 'User doesn\'t exist.'});
				}
				var event = new Event();
				event.experimonth = emid;
				event.user = id;
				event.kind = req.body.client_id;
				event.name = req.body.name;
				event.value = req.body.value;
				event.save(function(err, event){
					if(err || !event){
						return res.json(400, {'error': 'Error saving event.', 'err': err, 'event': event});
					}
					res.json(event);
				});
			});
		});
	});


	// NOTIFICATIONS
	// Post a new event. Requires at least a valid User and some text, but prefers to also have:
	//	- type = one of: ['warning', 'error', 'success', 'info']; defaults to 'warning'
	//	- format = an array of: ['web', 'email', 'sms']
	//	- subject = A subject line used for email-type notifications
	var _types = ['warning', 'error', 'success', 'info'];
	var _formats = ['web', 'email', 'sms'];
	app.post('/api/1/notifications', auth.clientAuthorize, function(req, res){
		var id = req.body.user;
		if(!id){
			return res.json(400, {'error': 'Missing User ID.'});
		}
		var text = req.body.text;
		if(!text){
			return res.json(400, {'error': 'Missing notification text.'});
		}
		var type = req.body.type;
		if(_types.indexOf(type) === -1){
			type = 'warning';
		}
		var format = req.body.format;
		if(format && format.length){
			for(var i = format.length-1; i >= 0; i--){
				if(_formats.indexOf(format[i]) === -1){
					format.splice(i, 1);
				}
			}
		}
		User.findById(id).exec(function(err, user){
			if(err || !user){
				return res.json(400, {'error': 'User doesn\'t exist.'});
			}
			Notification.notify(type, format, req.body.subject, text, id, function(err, notification){
				return res.json(notification);
			});
		});
	});
};