var util = require('util')
  , auth = require('../auth')
  , moment = require('moment')
  , form = require('express-form')
  , field = form.field
  , utilities = require('../utilities')
  , mongoose = require('mongoose')
  , Experimonth = mongoose.model('Experimonth')
/*   , Game = mongoose.model('Game') */
  , User = mongoose.model('User')
  , ProfileQuestion = mongoose.model('ProfileQuestion')
  , ProfileAnswer = mongoose.model('ProfileAnswer');

module.exports = function(app){

	app.get('/profile', auth.authorize(1, 0, null, true), function(req, res){
		Experimonth.find({_id: {$in: req.user.experimonths}}).exec(function(err, experimonths){
//			Game.find({_id: {$in: req.user.games}}).exec(function(err, games){
//				console.log('finding games:', err, games);
				ProfileAnswer.find({user: req.user._id}).populate('question').exec(function(err, answers){
					var questions = [];
					for(var i=0; i<answers.length; i++){
						questions.push(answers[i].question._id);
					}
					ProfileQuestion.find({published: true, _id: {$not: {$in: questions}}}).exec(function(err, questions){
						res.render('profile', {title: 'Your Profile', theuser: util.inspect(req.user), experimonths: experimonths, questions: questions, answers: answers/* , games: games */});
					});
				});
//			});
		});
	});
	
	app.get('/profile/questions', auth.authorize(2, 10), function(req, res){
		// Your profile questions
		ProfileQuestion.find({}).exec(function(err, questions){
			res.render('profile/questions', {title: 'Profile Questions', questions: questions});
		});
	});
	
	
	// (as, populate, title, object, template, varNames, redirect, beforeRender, beforeSave)
	var as = 'question'
	  , populate = []
	  , template = 'profile/questions/form'
	  , varNames = ['text', 'type']
	  , redirect = '/profile/questions'
	  , formValidate = form(
			field('text').trim().required()
		  , field('type').trim().required()
		  , field('choices_string').trim()
		)
	  , beforeRender = function(req, res, item, callback){
	/*
			if(item.confession && req.params && req.params.number){
				item.confession.text = 'This is in reply to confession #'+req.params.number+': ';
			}
			item.action = '/confessional';
	*/
			if(item.published){
				req.flash('error', 'This Profile Question has already been published and cannot be edited.');
				res.redirect('back');
				return;
			}
			return callback(item);
		}
	  , beforeSave = function(req, res, item, complete){
			// Convert choices_string into an array of strings
			if(req.param('choices_string')){
				var choices = req.param('choices_string');
				choices = choices.split(',');
				for(var i=0; i<choices.length; i++){
					choices[i] = choices[i].trim();
				}
				item.choices = choices;
			}
			complete(item);
			return;
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
		}
	  , layout = 'layout';
	
	app.get('/profile/questions/add', auth.authorize(2, 10), utilities.doForm(as, populate, 'Add Profile Question', ProfileQuestion, template, varNames, redirect, beforeRender, null, layout));
	app.post('/profile/questions/add', auth.authorize(2, 10), formValidate, utilities.doForm(as, populate, 'Add Profile Question', ProfileQuestion, template, varNames, redirect, beforeRender, beforeSave, layout));
	
	app.get('/profile/questions/edit/:id', auth.authorize(2, 10), utilities.doForm(as, populate, 'Edit Profile Question', ProfileQuestion, template, varNames, redirect, beforeRender, null, layout));
	app.post('/profile/questions/edit/:id', auth.authorize(2, 10), formValidate, utilities.doForm(as, populate, 'Add Profile Question', ProfileQuestion, template, varNames, redirect, beforeRender, beforeSave, layout));
	
	app.get('/profile/questions/delete/:id', auth.authorize(2, 10), function(req, res){
		if(!req.param('id')){
			req.flash('error', 'Missing Profile Question ID.');
			res.redirect('back');
			return;
		}
		ProfileQuestion.findById(req.param('id')).exec(function(err, question){
			if(err || !question){
				req.flash('error', 'Profile Question not found.');
				res.redirect('back');
				return;
			}
			if(question.published){
				req.flash('error', 'A published question may not be deleted.');
				res.redirect('back');
				return;
			}
			question.remove(function(err){
				if(err){
					req.flash('error', 'Error while deleting profile question: '+err);
					res.redirect('back');
					return;
				}
				req.flash('info', 'Profile Question deleted successfully.');
				res.redirect('back');
				return;
			});
		});
	});
	
	app.get('/profile/questions/publish/:id', auth.authorize(2, 10), function(req, res){
		if(!req.param('id')){
			req.flash('error', 'Missing Profile Question ID.');
			res.redirect('back');
			return;
		}
		ProfileQuestion.findById(req.param('id')).exec(function(err, question){
			if(err || !question){
				req.flash('error', 'Profile Question not found.');
				res.redirect('back');
				return;
			}
			if(question.published){
				req.flash('error', 'A published question may not be re-published.');
				res.redirect('back');
				return;
			}
			question.published = true;
			question.publishDate = new Date();
			question.save(function(err){
				if(err){
					req.flash('error', 'Error while publishing profile question: '+err);
					res.redirect('back');
					return;
				}
				// Send a notification to all existing users that a new question was published.
				User.notifyAll('Please check out the new profile question that was just published!', function(err){
					if(err){
						req.flash('error', 'Error notifying users! '+err);
						res.redirect('back');
						return;
					}
					req.flash('info', 'Profile Question published successfully.');
					res.redirect('back');
					return;
				});
			});
		});
	});
	
	app.post('/profile/questions/answer/:id', auth.authorize(2, 0, null, true), function(req, res){
		if(!req.param('id')){
			req.flash('error', 'Missing Profile Question ID.');
			res.redirect('back');
			return;
		}
		if(!req.param('value') && !req.param('no_answer')){
			req.flash('error', 'Please answer the question or check the \'Choose not to answer\' box.');
			res.redirect('back');
			return;
		}
		if(req.param('answerid')){
			ProfileAnswer.findById(req.param('answerid')).exec(function(err, answer){
				if(err || !answer){
					req.flash('error', 'Previous answer couldn\'t be retrieved');
					res.redirect('back');
					return;
				}
				answer.value = req.param('value');
				answer.no_answer = req.param('no_answer') == 'on';
				if(answer.no_answer){
					answer.value = null;
				}
				answer.save(function(err){
					if(err){
						req.flash('error', 'Error saving existing answer!');
						res.redirect('back');
						return;
					}
					req.flash('info', 'Thanks for your answer!');
					res.redirect('back');
					return;
				});
			});
			return;
		}
	
		var answer = new ProfileAnswer();
		answer.user = req.user._id;
		answer.question = req.param('id');
		answer.value = req.param('value');
		answer.no_answer = req.param('no_answer') == 'on';
		if(answer.no_answer){
			answer.value = null;
		}
		answer.save(function(err){
			if(err){
				req.flash('error', 'Error saving new answer!');
				res.redirect('back');
				return;
			}
			req.flash('info', 'Thanks for your answer!');
			res.redirect('back');
			return;
		});
	});
};