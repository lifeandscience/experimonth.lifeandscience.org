var util = require('util')
  , utilities = require('../utilities')
  , form = require('express-form')
  , field = form.field
  , auth = require('../auth')
  , mongoose = require('mongoose')
  , Experimonth = mongoose.model('Experimonth')
  , ExperimonthKind = mongoose.model('ExperimonthKind')
  , ExperimonthEnrollment = mongoose.model('ExperimonthEnrollment')
  , ProfileQuestion = mongoose.model('ProfileQuestion')
  , User = mongoose.model('User')
  , s3 = require('../s3');

module.exports = function(app){
	app.get('/experimonths', auth.authorize(2), function(req, res){
		var params = {};
		if(!req.user || req.user.role < 10){
			params.published = true;
		}
		var finish = function(enrollGoesToProfile){
			Experimonth.find(params).populate('kind').exec(function(err, experimonths){
				res.render('experimonths/experimonths', {title: 'Experimonths', experimonths: experimonths, enrollGoesToProfile: enrollGoesToProfile});
			});
		}
		req.user.checkProfileQuestions(req, function(questions, answers){
			// The user did not complete all the required questions.
			req.flash('error', 'You must answer all required profile questions before enrolling in an Experimonth.');
			finish(true);
		}, function(){
			finish(false);
		});
	});
	app.get('/currently-recruiting', /* auth.authorize(2), */ function(req, res){
		var params = {};
		if(!req.user || req.user.role < 10){
			params.published = true;
		}
		var finish = function(enrollGoesToProfile){
			Experimonth.find(params).populate('kind').exec(function(err, experimonths){
				res.render('experimonths', {title: 'Currently Recruiting', experimonths: experimonths, enrollGoesToProfile: enrollGoesToProfile});
			});
		}
		if(req.user){
			req.user.checkProfileQuestions(req, function(questions, answers){
				// The user did not complete all the required questions.
				req.flash('error', 'You must answer all required profile questions before enrolling in an Experimonth.');
				finish(true);
			}, function(){
				finish(false);
			});
		}else{
			finish(false);
		}
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
		// Check if the user has answered all the required profile questions
		req.user.checkProfileQuestions(req, function(questions, answers){
			// The user did not complete all the required questions.
			req.flash('error', 'You must answer all required profile questions before enrolling in an Experimonth.');
			res.redirect('back');
		}, function(){
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
				if(!experimonth.survey){
					var enrollment = new ExperimonthEnrollment();
					enrollment.user = req.user._id;
					enrollment.experimonth = experimonth._id;
					enrollment.survey = 'N/A';
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
									
								req.flash('info', 'You were enrolled successfully. Watch for notifications when the Experimonth is due to start.');
								res.redirect('back');
								return;
							});
						});
					});
					return;
				}
				
				// We have a survey / consent form. Let's present it.
				res.render('experimonths/enroll', {title: 'Experimonth: '+experimonth.name, experimonth: experimonth});
			});
		});
	});
	
	app.post('/experimonths/enroll/:id', auth.authorize(2), function(req, res){
		if(req.user.experimonths.indexOf(req.param('id')) != -1){
			req.flash('info', 'You are already enrolled in this Experimonth.');
			res.redirect('back');
			return;
		}
		// Check if the user has answered all the required profile questions
		req.user.checkProfileQuestions(req, function(questions, answers){
			// The user did not complete all the required questions.
			req.flash('error', 'You must answer all required profile questions before enrolling in an Experimonth.');
			res.redirect('back');
		}, function(){
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
				
				var enrollment = new ExperimonthEnrollment();
				enrollment.user = req.user;
				enrollment.experimonth = experimonth;
				enrollment.survey = req.param('submit');
				enrollment.save(function(err, enrollment){
					if(err){
						req.flash('error', 'Error saving Experimonth Enrollment. '+err);
						res.redirect('/currently-recruiting');
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
							res.redirect('/currently-recruiting');
							return;
						}
						req.user.enrollments.push(enrollment._id);
						req.user.experimonths.push(experimonth._id);
						req.user.save(function(err){
							if(err){
								req.flash('error', 'Error saving user with ID '+req.user._id+'. '+err);
								res.redirect('/currently-recruiting');
								return;
							}
								
							req.flash('info', 'You were enrolled successfully. Watch for notifications when the Experimonth is due to start.');
							res.redirect('/currently-recruiting');
							return;
						});
					});
				});
				return;
			});
		});
	});
	
	app.get('/experimonths/unenroll/:id', auth.authorize(2), function(req, res){
		if(req.user.experimonths.indexOf(req.param('id')) == -1){
			req.flash('info', 'You are not enrolled in this Experimonth.');
			res.redirect('back');
			return;
		}
		ExperimonthEnrollment.find({experimonth: req.param('id'), user: req.user._id}).exec(function(err, enrollment){
			if(err || !enrollment || enrollment.length == 0){
				req.flash('error', 'Error finding Enrollment in the Experimonth with ID '+req.param('id')+'. '+err);
				res.redirect('back');
				return;
			}
			enrollment = enrollment[0];
			console.log('enrollment: ', enrollment);

			Experimonth.findById(req.param('id')).exec(function(err, experimonth){
				if(err || !experimonth){
					req.flash('error', 'Error finding Experimonth with ID '+req.param('id')+'. '+err);
					res.redirect('back');
					return;
				}
				if(experimonth.enrollments.indexOf(enrollment._id.toString()) != -1){
					console.log('removing enrollment from experimonth.');
					experimonth.enrollments.splice(experimonth.enrollments.indexOf(enrollment._id.toString()), 1);
				}
				if(experimonth.users.indexOf(req.user._id.toString()) != -1){
					console.log('removing user from experimonth.');
					experimonth.users.splice(experimonth.users.indexOf(req.user._id.toString()), 1);
				}
		/*
				if(!experimonth.open){
					req.flash('error', 'This Experimonth is not open for enrollment.');
					res.redirect('back');
					return;
				}
		*/
		/*
				if(experimonth.players.length >= experimonth.playerLimit){
					req.flash('error', 'Player limit reached for this Experimonth.');
					res.redirect('back');
					return;
				}
		*/
				
		
		/* 		experimonth.players.push(req.user._id); */
				experimonth.save(function(err){
					if(err){
						req.flash('error', 'Error saving Experimonth with ID '+req.param('id')+'. '+err);
						res.redirect('back');
						return;
					}
					if(req.user.experimonths.indexOf(req.param('id')) != -1){
						console.log('removing experimonth from user.');
						req.user.experimonths.splice(req.user.experimonths.indexOf(req.param('id')), 1);
					}
					if(req.user.enrollments.indexOf(enrollment._id.toString()) != -1){
						console.log('removing enrollment from user.');
						req.user.enrollments.splice(req.user.enrollments.indexOf(enrollment._id.toString()), 1);
					}
					req.user.save(function(err){
						if(err){
							req.flash('error', 'Error saving user with ID '+req.user._id+'. '+err);
							res.redirect('back');
							return;
						}
						
						enrollment.remove(function(err){
							if(err){
								req.flash('error', 'Error removing enrollment with ID '+enrollment._id+'. '+err);
								res.redirect('back');
								return;
							}
							
							req.flash('info', 'You were un-enrolled successfully.');
							res.redirect('back');
							return;
						});
					});
				});
			});
			
			// http://app.dev:8000/experimonths/unenroll/513f596f40a9834325000001
		});
		return;
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
	  , varNames = ['name', 'description', 'type', 'image', 'startDate', 'endDate', 'userLimit', 'unlimited', 'open', 'conditions', 'kind', 'survey']
	  , redirect = '/experimonths'
	  , formValidate = form(
			field('name').trim()
		  , field('description').trim()
		  , field('type').array().trim()
//		  , field('image').trim()
		  , field('startDate').trim().required().isDate()
		  , field('endDate').trim().required().isDate()
		  , field('userLimit').trim().isNumeric()
		  , field('unlimited').trim()
		  , field('open').trim()
		  , field('conditions').array().trim()
		  , field('kind').trim()
		  , field('survey').trim()
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
						console.log('error finding questions to use as conditions: ', err);
						questions = [];
					}
					item.questions = questions;
					return callback(item);
				});
			});
		}
	  , beforeSave = function(req, res, item, complete){
			// Take the image to S3!
			if(req.files && req.files.image && req.files.image.size){
				s3.uploadFile(req.files.image, null, function(err, url){
					if(err){
						console.log('error uploading file: ', err);
					}else if(url){
						item.image = url;
					}
					return complete(item);
				});
			}else{
				return complete(item);
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
				// Send a notification to all existing users that a new question was published.
				User.notifyAll('info', null, 'New Experimonth Available.', 'Please check out the new Experimonth that was just published.', function(err){
					if(err){
						req.flash('error', 'Error notifying users. '+err);
						res.redirect('back');
						return;
					}
					req.flash('info', 'Experimonth '+(experimonth.published ? 'published' : 'unpublished')+' successfully.');
					res.redirect('back');
					return;
				});
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

};