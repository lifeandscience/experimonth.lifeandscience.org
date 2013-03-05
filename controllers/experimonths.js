var util = require('util')
  , utilities = require('../utilities')
  , form = require('express-form')
  , field = form.field
  , auth = require('../auth')
  , mongoose = require('mongoose')
  , Experimonth = mongoose.model('Experimonth')
  , ProfileQuestion = mongoose.model('ProfileQuestion')
  , moment = require('moment');

module.exports = function(app){
	app.get('/experimonths', auth.authorize(2), function(req, res){
		Experimonth.find().exec(function(err, experimonths){
			res.render('experimonths', {title: 'Upcoming Experimonths', experimonths: experimonths, moment: moment});
		});
	});
	
	app.get('/experimonths/view/:id', auth.authorize(2), function(req, res){
		Experimonth.findById(req.param('id')).populate('users').exec(function(err, experimonth){
			if(err || !experimonth){
				req.flash('error', 'Experimonth with ID of '+req.param('id')+' was not found.');
				res.redirect('back');
				return;
			}
			res.render('experimonths/view', {title: 'Experimonth: '+req.param('id'), experimonth: experimonth, moment: moment});
		});
	});
	
	app.get('/experimonths/enroll/:id', auth.authorize(2), function(req, res){
		if(req.user.experimonths.indexOf(req.param('id')) != -1){
			req.flash('info', 'You are already enrolled in this Experimonth!');
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
				req.flash('info', 'You are already *partially* enrolled in this Experimonth!');
				res.redirect('back');
				return;
			}
			if(!experimonth.open){
				req.flash('error', 'This Experimonth is not open for enrollment!');
				res.redirect('back');
				return;
			}
			if(experimonth.users.length >= experimonth.userLimit){
				req.flash('error', 'Player limit reached for this Experimonth!');
				res.redirect('back');
				return;
			}
	
			experimonth.users.push(req.user._id);
			if(experimonth.users.length == experimonth.userLimit){
				experimonth.open = false;
			}
			experimonth.save(function(err){
				if(err){
					req.flash('error', 'Error saving Experimonth with ID '+req.param('id')+'. '+err);
					res.redirect('back');
					return;
				}
				req.user.experimonths.push(experimonth._id);
				req.user.save(function(err){
					if(err){
						req.flash('error', 'Error saving user with ID '+req.user._id+'. '+err);
						res.redirect('back');
						return;
					}
					req.flash('info', 'You were enrolled successfully! Watch for notifications when the Experimonth is due to start!');
					res.redirect('back');
					return;
				});
			});
		});
	});
	
	app.get('/experimonths/unenroll/:id', auth.authorize(2), function(req, res){
		if(req.user.experimonths.indexOf(req.param('id')) == -1){
			req.flash('info', 'You are not enrolled in this Experimonth!');
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
				experimonth.users.splice(experimonth.users.indexOf(req.user._id.toString()), 1);
			}
	/*
			if(!experimonth.open){
				req.flash('error', 'This Experimonth is not open for enrollment!');
				res.redirect('back');
				return;
			}
	*/
	/*
			if(experimonth.players.length >= experimonth.playerLimit){
				req.flash('error', 'Player limit reached for this Experimonth!');
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
					req.user.experimonths.splice(req.user.experimonths.indexOf(req.param('id')), 1);
				}
				req.user.save(function(err){
					if(err){
						req.flash('error', 'Error saving user with ID '+req.user._id+'. '+err);
						res.redirect('back');
						return;
					}
					req.flash('info', 'You were un-enrolled successfully!');
					res.redirect('back');
					return;
				});
			});
		});
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
	  , varNames = ['name', 'description', 'type', 'image', 'startDate', 'endDate', 'userLimit', 'open', 'conditions']
	  , redirect = '/experimonths'
	  , formValidate = form(
			field('name').trim()
		  , field('description').trim()
		  , field('type').array().trim()
		  , field('image').trim()
		  , field('startDate').trim().required().isDate()
		  , field('endDate').trim().required().isDate()
		  , field('userLimit').trim().isNumeric()
		  , field('open').trim()
		  , field('conditions').array().trim()
		)
	  , beforeRender = function(req, res, item, callback){
	/*
			if(item.confession && req.params && req.params.number){
				item.confession.text = 'This is in reply to confession #'+req.params.number+': ';
			}
			item.action = '/confessional';
	*/
			ProfileQuestion.find({published: true}).exec(function(err, questions){ 
				if(err){
					console.log('error finding questions to use as conditions: ', err);
					questions = [];
				}
				item.questions = questions;
				return callback(item);
			})
		}
	  , beforeSave = function(req, res, item, complete){
	/*
			// Email to Beck
			// setup e-mail data with unicode symbols
			Confession.count(function(err, count){
				item.number = count+1;
	
				var mailOptions = {
			    	from: "Experimonth: Frenemy <experimonth@lifeandscience.org>", // sender address
			    	to: 'experimonth+confessional@lifeandscience.org', // list of receivers
			    	subject: 'New confession!', // Subject line
			    	text: 'New Confessional posted on '+moment(item.date).format('YYYY-MM-DD hh:mm A')+'\n\n---\n\n'+item.text
			    };
	
			    // send mail with defined transport object
				email.sendMail(mailOptions, null);
				complete(item);
			});
	*/
			complete(item);
		}
	  , layout = 'layout';
	
	app.get('/experimonths/add', auth.authorize(2, 10), utilities.doForm(as, populate, 'Add Experimonth', Experimonth, template, varNames, redirect, beforeRender, null, layout));
	app.post('/experimonths/add', auth.authorize(2, 10), formValidate, utilities.doForm(as, populate, 'Add Experimonth', Experimonth, template, varNames, redirect, beforeRender, beforeSave, layout));
	
	app.get('/experimonths/edit/:id', auth.authorize(2, 10), utilities.doForm(as, populate, 'Edit Experimonth', Experimonth, template, varNames, redirect, beforeRender, null, layout));
	app.post('/experimonths/edit/:id', auth.authorize(2, 10), formValidate, utilities.doForm(as, populate, 'Add Experimonth', Experimonth, template, varNames, redirect, beforeRender, beforeSave, layout));

};