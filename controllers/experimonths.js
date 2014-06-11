var util = require('util')
  , utilities = require('../utilities')
  , form = require('express-form')
  , field = form.field
  , auth = require('../auth')
  , mongoose = require('mongoose')
  , Notification = mongoose.model('Notification')
  , Experimonth = mongoose.model('Experimonth')
  , ExperimonthKind = mongoose.model('ExperimonthKind')
  , ExperimonthEnrollment = mongoose.model('ExperimonthEnrollment')
  , ProfileQuestion = mongoose.model('ProfileQuestion')
  , User = mongoose.model('User')
  , Event = mongoose.model('Event')
  , s3 = require('../s3')
  , moment = require('moment')
  , async = require('async');

module.exports = function(app){
	app.get('/experimonths', auth.authorize(2), function(req, res){
		var params = {};
		if(!req.user || req.user.role < 10){
			params.published = true;
		}
		Experimonth.find(params).sort('startDate').populate('kind').exec(function(err, experimonths){
			res.render('experimonths/experimonths', {title: 'Experimonths', experimonths: experimonths});
		});
	});
	app.get('/currently-recruiting', /* auth.authorize(2), */ function(req, res){
		var params = {};
		if(!req.user || req.user.role < 10){
			params.published = true;
		}
		Experimonth.find(params).sort('startDate').populate('kind').exec(function(err, experimonths){
			res.render('experimonths', {title: 'Currently Recruiting', experimonths: experimonths});
		});
	});
	
	app.get('/experimonths/view/:id', auth.authorize(2), function(req, res){
		Experimonth.findById(req.param('id')).populate('users').exec(function(err, experimonth){
			if(err || !experimonth){
				req.flash('error', 'Experimonth with ID of '+req.param('id')+' was not found.');
				res.redirect('back');
				return;
			}
			res.render('experimonths/view', {title: 'Experimonth: '+experimonth.name, experimonth: experimonth});
		});
	});
	
	app.get('/experimonths/enroll/:id', auth.authorize(2), function(req, res){
		if(req.user.experimonths.indexOf(req.param('id')) != -1){
			req.flash('info', 'You are already enrolled in this Experimonth.');
			res.redirect('back');
			return;
		}
		Experimonth.findById(req.param('id')).exec(function(err, experimonth){
			if(err || !experimonth){
				req.flash('error', 'Error finding Experimonth with ID '+req.param('id')+'. '+err);
				res.redirect('back');
				return;
			}
			if(experimonth.users.indexOf(req.user._id.toString()) != -1){
				req.flash('info', 'You are already *partially* enrolled in this Experimonth.');
				res.redirect('back');
				return;
			}
			if(!experimonth.open){
				req.flash('error', 'This Experimonth is not open for enrollment.');
				res.redirect('back');
				return;
			}
			if(!experimonth.unlimited && experimonth.users.length >= experimonth.userLimit){
				req.flash('error', 'Player limit reached for this Experimonth.');
				res.redirect('back');
				return;
			}
			
			// If there's not a consent form, add them and be done!
			var enrollment = new ExperimonthEnrollment();
			enrollment.user = req.user._id;
			enrollment.experimonth = experimonth._id;
			enrollment.save(function(err, enrollment){
				if(err){
					req.flash('error', 'Error saving Experimonth Enrollment. '+err);
					res.redirect('back');
					return;
				}
				experimonth.enrollments.push(enrollment._id);
				experimonth.users.push(req.user._id);
				if(!experimonth.unlimited && experimonth.users.length == experimonth.userLimit){
					experimonth.open = false;
				}
				experimonth.save(function(err){
					if(err){
						req.flash('error', 'Error saving Experimonth with ID '+req.param('id')+'. '+err);
						res.redirect('back');
						return;
					}
					req.user.enrollments.push(enrollment._id);
					req.user.experimonths.push(experimonth._id);
					req.user.save(function(err){
						if(err){
							req.flash('error', 'Error saving user with ID '+req.user._id+'. '+err);
							res.redirect('back');
							return;
						}

						req.user.reCheckProfileQuestions(null, function(err){
							// Send the user the welcome message if it exists!
							if(experimonth.welcomeMessage){
								Notification.notify('success', ['web', 'email'], 'Welcome to '+experimonth.name, experimonth.welcomeMessage, req.user, null);
							}
							req.flash('info', 'You were enrolled successfully. Watch for notifications when the Experimonth is due to start.');
							res.redirect('back');
						});
					});
				});
			});
		});
	});
	
	app.get('/experimonths/unenroll/:userID/:experimonthID', auth.authorize(2, 10), function(req, res){
		User.find({_id: req.param('userID')}).exec(function(err, users){
			if(err || !users || users.length == 0){
				req.flash('info', 'User not found');
				res.redirect('back');
				return;
			}
			var user = users[0]
			return user.unenrollUserFromExperimonth(req.param('experimonthID'), req, res, function(err, experimonth){
				if(!err && experimonth){
					// Send an email?
					req.flash('info', user.email+' was un-enrolled successfully.');
					res.redirect('back');
					
					var message = 'You\'ve been unenrolled from '+experimonth.name+' either because you requested it, or because you haven\'t been playing several days in a row. If you want to keep playing or believe this was done in error, please reply to this email and we\'ll activate you for tomorrow\'s game.';
					Notification.notify('success', ['web', 'email'], 'You\'ve been unenrolled from '+experimonth.name, message, user, null);
				}
			});
		});
	});
	
	app.get('/experimonths/unenroll/:id', auth.authorize(2), function(req, res){
		if(req.user.experimonths.indexOf(req.param('id')) == -1){
			req.flash('info', 'You are not enrolled in this Experimonth.');
			res.redirect('back');
			return;
		}
		return req.user.unenrollUserFromExperimonth(req.param('id'), req, res);
	});
	
	/*
	app.get('/experimonths/add', auth.authorize(2), function(req, res){
		res.render('experimonths/form', {title: 'Add Experimonth', experimonth: {}});
	});
	app.post('/experimonths/add', auth.authorize(2), function(req, res){
		
	});
	*/
	
	
	// (as, populate, title, object, template, varNames, redirect, beforeRender, beforeSave)
	var as = 'experimonth'
	  , populate = []
	  , template = 'experimonths/form'
	  , varNames = ['name', 'description', 'welcomeMessage', 'type', 'image', 'startDate', 'endDate', 'userLimit', 'unlimited', 'open', 'conditions', 'requiredQuestions', 'optionalQuestions', 'kind']
	  , redirect = '/experimonths'
	  , formValidate = form(
			field('name').trim()
		  , field('description').trim()
		  , field('welcomeMessage').trim()
		  , field('type').array().trim()
//		  , field('image').trim()
		  , field('startDate').trim().required().isDate()
		  , field('endDate').trim().required().isDate()
		  , field('userLimit').trim().isNumeric()
		  , field('unlimited').trim()
		  , field('open').trim()
		  , field('conditions').array().trim()
		  , field('requiredQuestions').array().trim()
		  , field('optionalQuestions').array().trim()
		  , field('kind').trim()
		)
	  , beforeRender = function(req, res, item, callback){
	/*
			if(item.confession && req.params && req.params.number){
				item.confession.text = 'This is in reply to confession #'+req.params.number+': ';
			}
			item.action = '/confessional';
	*/
			ExperimonthKind.find().exec(function(err, kinds){
				if(err){
					console.log('error finding kinds to use as kinds: ', err);
					kinds = [];
				}
				item.kinds = kinds;
				ProfileQuestion.find({published: true}).exec(function(err, questions){ 
					if(err){
						console.log('error finding questions to use as conditions / requiredQuestions / optionalQuestions: ', err);
						questions = [];
					}
					item.questions = questions;
					return callback(item);
				});
			});
		}
	  , beforeSave = function(req, res, item, complete){
			// Take the image to S3!
			if(!req.body.open){
				item.open = false;
			}
			if(!req.body.unlimited){
				item.unlimited = false;
			}

			if(req.files && req.files.image && req.files.image.size){
				s3.uploadFile(req.files.image, null, function(err, url){
					if(err){
						console.log('error uploading file: ', err);
					}else if(url){
						item.image = url;
					}
					return User.reCheckAllUsersProfileQuestions(function(){
						complete(item);
					});
				});
			}else{
				return User.reCheckAllUsersProfileQuestions(function(){
					complete(item);
				});
			}
			
	/*
			// Email to Beck
			// setup e-mail data with unicode symbols
			Confession.count(function(err, count){
				item.number = count+1;
	
				var mailOptions = {
			    	from: "Experimonth: Frenemy <experimonth@lifeandscience.org>", // sender address
			    	to: 'experimonth+confessional@lifeandscience.org', // list of receivers
			    	subject: 'New confession.', // Subject line
			    	text: 'New Confessional posted on '+moment(item.date).format('YYYY-MM-DD hh:mm A')+'\n\n---\n\n'+item.text
			    };
	
			    // send mail with defined transport object
				email.sendMail(mailOptions, null);
				complete(item);
			});
	*/
/* 			complete(item); */
		}
	  , layout = 'layout';
	
	app.get('/experimonths/add', auth.authorize(2, 10), utilities.doForm(as, populate, 'Add Experimonth', Experimonth, template, varNames, redirect, beforeRender, null, layout));
	app.post('/experimonths/add', auth.authorize(2, 10), formValidate, utilities.doForm(as, populate, 'Add Experimonth', Experimonth, template, varNames, redirect, beforeRender, beforeSave, layout));
	
	app.get('/experimonths/edit/:id', auth.authorize(2, 10), utilities.doForm(as, populate, 'Edit Experimonth', Experimonth, template, varNames, redirect, beforeRender, null, layout));
	app.post('/experimonths/edit/:id', auth.authorize(2, 10), formValidate, utilities.doForm(as, populate, 'Edit Experimonth', Experimonth, template, varNames, redirect, beforeRender, beforeSave, layout));
	
	
	
	app.get('/experimonths/publish/:id', auth.authorize(2, 10), function(req, res){
		if(!req.param('id')){
			req.flash('error', 'Missing Experimonth ID.');
			res.redirect('back');
			return;
		}
		Experimonth.findById(req.param('id')).exec(function(err, experimonth){
			if(err || !experimonth){
				req.flash('error', 'Experimonth not found.');
				res.redirect('back');
				return;
			}
/*
			if(experimonth.published){
				req.flash('error', 'A published experimonth may not be re-published.');
				res.redirect('back');
				return;
			}
*/
			experimonth.everPublished = true;
			experimonth.published = !experimonth.published;
			experimonth.publishDate = new Date();
			experimonth.save(function(err){
				if(err){
					req.flash('error', 'Error while publishing experimonth: '+err);
					res.redirect('back');
					return;
				}
				req.flash('info', 'Experimonth '+(experimonth.published ? 'published' : 'unpublished')+' successfully.');
				res.redirect('back');
				return;
			});
		});
	});	
	
	app.get('/experimonths/kinds', auth.authorize(2), function(req, res){
		ExperimonthKind.find().exec(function(err, experimonthKinds){
			res.render('experimonths/kinds', {title: 'Kinds of Experimonths', experimonthKinds: experimonthKinds});
		});
	});
	
	app.get('/experimonths/kinds/view/:id', auth.authorize(2), function(req, res){
		ExperimonthKind.findById(req.param('id')).exec(function(err, experimonthKind){
			if(err || !experimonthKind){
				req.flash('error', 'Kind of Experimonth with ID of '+req.param('id')+' was not found.');
				res.redirect('back');
				return;
			}
			res.render('experimonths/kinds/view', {title: 'Kind of Experimonth: '+req.param('id'), experimonthKind: experimonthKind});
		});
	});
	
	// (as, populate, title, object, template, varNames, redirect, beforeRender, beforeSave)
	as = 'experimonthKind';
	populate = [];
	template = 'experimonths/kinds/form';
	varNames = ['name', 'url', 'instructions'];
	redirect = '/experimonths/kinds';
	formValidate = form(
		field('name').trim()
	  , field('url').trim()
	  , field('instructions').trim()
	);
	beforeRender = null;
	beforeSave = null;
	layout = 'layout';
	
	app.get('/experimonths/kinds/add', auth.authorize(2, 10), utilities.doForm(as, populate, 'Add Kind of Experimonth', ExperimonthKind, template, varNames, redirect, beforeRender, null, layout));
	app.post('/experimonths/kinds/add', auth.authorize(2, 10), formValidate, utilities.doForm(as, populate, 'Add Kind of Experimonth', ExperimonthKind, template, varNames, redirect, beforeRender, beforeSave, layout));
	
	app.get('/experimonths/kinds/edit/:id', auth.authorize(2, 10), utilities.doForm(as, populate, 'Edit Kind of Experimonth', ExperimonthKind, template, varNames, redirect, beforeRender, null, layout));
	app.post('/experimonths/kinds/edit/:id', auth.authorize(2, 10), formValidate, utilities.doForm(as, populate, 'Add Kind of Experimonth', ExperimonthKind, template, varNames, redirect, beforeRender, beforeSave, layout));
	
	app.get('/experimonths/events/export/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			req.flash('error', 'Experimonth ID missing.');
			res.redirect('back');
			return;
		}
		res.writeHead(200, {
			'Content-Type': 'text/tsv',
			'Content-Disposition': 'attachment;filename=experimonth-'+req.params.id+'.tsv'
		});
		var csv = 'Event ID\tEvent Timestamp\tEvent Name\tEvent Value\tStudy ID\tfrenemy:moodAtGameStart - Stressed\tfrenemy:moodAtGameStart - Happy\tfrenemy:moodAtGameStart - Tired\n';
		res.write(csv);

		var numEvents = 0
		  , stream = null
		  , totallyDone = false
		  , checkDone = function(){
				if(--numEvents == 0){
					if(totallyDone){
						util.log('totally done.');
						if(hasFoundEvent){
							// We found at least one game
							// Maybe the query needs to be re-run starting at an offset of offset
							createQueryStream(offset);
						}else{
							res.end();
						}
					}
				}
			}
		  , hasFoundEvent = false
		  , offset = 0
		  , games = {}
		  , userTransformableValues = [
				'frenemy:walkaway',
				'frenemy:walkedAwayFrom',
				'frenemy:viewedCompletedRoundScreen',
				'frenemy:startGame'
			]
		  , queryDataFunction = function(event){
		  		++offset;
	
		  		++numEvents;
		  		hasFoundEvent = true;
		  		
				var addToCSV = event._id + '\t' + moment(event.date).format('YYYY-MM-DD hh:mm A') + '\t' + event.name + '\t';
				if(userTransformableValues.indexOf(event.name) != -1){
					addToCSV += User.getStudyID(event.value);
				}else{
					addToCSV += event.value;
				}
				addToCSV += '\t' + User.getStudyID(event.user) + '\t';
				if(event.name === 'frenemy:moodAtGameStart'){
					var val = JSON.parse(event.value);
					if(val.stressed){
						addToCSV += val.stressed;
					}
					addToCSV += '\t';
					if(val.happy){
						addToCSV += val.happy;
					}
					addToCSV += '\t';
					if(val.tired){
						addToCSV += val.tired;
					}
				}else{
					addToCSV += '\t\t';
				}
				addToCSV += '\n';

				// Determine which of the users was this one in the round
				res.write(addToCSV);
				checkDone();
			}
		  , queryErrorFunction = function(){
				res.end();
			}
		  , queryCloseFunction = function(){
				totallyDone = true;
				++numEvents;
				checkDone();
			}
		  , createQueryStream = function(skip){
		  		var query = Event.find({experimonth: req.params.id}).sort('date');
		  		if(skip){
			  		query.skip(skip);
		  		}
		  		hasFoundEvent = false;
		  		stream = query.stream();
				stream.on('data', queryDataFunction);
				stream.on('error', queryErrorFunction);
				stream.on('close', queryCloseFunction); //.run(function(err, games){
		  	};
		createQueryStream();
		return;
	});
	
	
	
	app.get('/experimonths/notify/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			req.flash('error', 'Experimonth ID missing.');
			res.redirect('back');
			return;
		}
		Experimonth.findOne({_id: req.params.id}).exec(function(err, experimonth){
			if(err || !experimonth){
				req.flash('error', 'Experimonth not found.');
				res.redirect('back');
				return;
			}
			res.render('experimonths/notifyAll', {title: 'Notify All Users', subject: '', message: '', experimonth: experimonth});
		});
	});
	app.post('/experimonths/notify/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			req.flash('error', 'Experimonth ID missing.');
			res.redirect('back');
			return;
		}
		var subject = req.param('subject');
		var message = req.param('message');
		if(!subject || subject.length == 0){
			req.flash('error', 'Please provide a subject.');
			res.render('experimonths/notifyAll', { title: 'Notify All Users Enrolled In '+experimonth.name, subject: subject, message: message, experimonth: experimonth });
			return;
		}
		if(!message || message.length == 0){
			req.flash('error', 'Please provide a message.');
			res.render('experimonths/notifyAll', { title: 'Notify All Users Enrolled In '+experimonth.name, subject: subject, message: message, experimonth: experimonth });
			return;
		}

		Experimonth.findOne({_id: req.params.id}).populate('users').exec(function(err, experimonth){
			if(err || !experimonth){
				req.flash('error', 'Experimonth not found.');
				res.redirect('back');
				return;
			}
			
			async.each(experimonth.users, function(user, callback){
				Notification.notify('info', null, subject, message, user, callback);
			}, function(err){
				if(err){
					req.flash('error', 'Error notifying users. '+err);
					res.redirect('back');
					return;
				}
				req.flash('info', 'Users notified successfully!');
				res.redirect('back');
				return;
			});
		});
	});

};