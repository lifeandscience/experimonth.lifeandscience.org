var form = require('express-form')
  , field = form.field
  , utilities = require('../utilities')
  , mongoose = require('mongoose')
  , Confession = mongoose.model('Confession')
  , Event = mongoose.model('Event')
  , moment = require('moment')
  , email = require('../email')
  , util = require('util')
  , auth = require('../auth');

module.exports = function(app){
	app.get('/confessions', function(req, res){
		var query = Confession.find({});
		if(!req.user || req.user.role < 10){
			query.where('active', true);
		}else{
			query.populate('recentEvents');
		}
		query.sort('-number').exec(function(err, confessions){
			for(var i=0; i<confessions.length; i++){
				confessions[i].text = confessions[i].text.replace(/\r\n/gmi, '<br/>').replace(/\r/gmi, '<br/>').replace(/\n/gmi, '<br/>');
			}
			res.render('confessions', {title: 'All Confessions', confessions: confessions, moment: moment});
		});
	});
	
	app.get('/confessions/numberExisting', auth.authorize(2, 10), function(req, res){
		var start = 1;
		Confession.find().sort('date').exec(function(err, confessions){
			for(var i=0; i<confessions.length; i++){
				if(!confessions[i].number || confessions[i].number == -1){
					confessions[i].number = start++;
					confessions[i].active = true;
					confessions[i].save();
				}
			}
			req.flash('info', 'Done numbering existing confessions.');
			res.redirect('/confessions');
		});
	});
	
	app.get('/confessions/flag/:id', function(req, res){
		if(!req.params.id){
			req.flash('error', 'Confession ID required.');
			res.redirect('/confessions');
			return;
		}
		Confession.findById(req.params.id).exec(function(err, confession){
			if(err || !confession){
				req.flash('error', 'Confession not found.');
				res.redirect('/confessions');
				return;
			}
			confession.flags++;
			confession.save(function(err){
	
				var mailOptions = {
			    	to: 'experimonth+confessional@lifeandscience.org', // list of receivers
			    	subject: 'Flagged Confession.', // Subject line
			    	text: 'Confessional #'+confession.number+' was flagged, bringing it\'s total number of flags to '+confession.flags+' on '+moment().format('YYYY-MM-DD hh:mm A')+'\n\n---\n\n'+confession.text
			    };
	
			    // send mail with defined transport object
				email.sendMail(mailOptions, null);
	
				req.flash('info', 'Confession flagged.');
				res.redirect('/confessions');
				return;
			});
			return;
		});
	});
	
	app.get('/confessions/promote/:id', function(req, res){
		if(!req.params.id){
			req.flash('error', 'Confession ID required.');
			res.redirect('/confessions');
			return;
		}
		Confession.findById(req.params.id).exec(function(err, confession){
			if(err || !confession){
				req.flash('error', 'Confession not found.');
				res.redirect('/confessions');
				return;
			}
			confession.promoted = !confession.promoted;
			confession.save(function(err){
				req.flash('info', 'Confession '+(confession.promoted ? 'promoted.' : 'demoted.'));
				res.redirect('/confessions');
				return;
			});
			return;
		});
	});
	
	app.get('/confessions/publish/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			req.flash('error', 'Confession ID required.');
			res.redirect('/confessions');
			return;
		}
		Confession.findById(req.params.id).exec(function(err, confession){
			if(err || !confession){
				req.flash('error', 'Confession not found.');
				res.redirect('/confessions');
				return;
			}
			confession.active = true;
			confession.save(function(err){
				req.flash('info', 'Confession published.');
				res.redirect('/confessions');
				return;
			});
			return;
		});
	});
	
	app.get('/confessions/unpublish/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			req.flash('error', 'Confession ID required.');
			res.redirect('/confessions');
			return;
		}
		Confession.findById(req.params.id).exec(function(err, confession){
			if(err || !confession){
				req.flash('error', 'Confession not found.');
				res.redirect('/confessions');
				return;
			}
			confession.active = false;
			confession.save(function(err){
				req.flash('info', 'Confession unpublished.');
				res.redirect('/confessions');
				return;
			});
			return;
		});
	});
	
	// (as, populate, title, object, template, varNames, redirect, beforeRender, beforeSave)
	var as = 'confession'
	  , populate = []
	  , template = 'confessions/form'
	  , varNames = ['text']
	  , redirect = '/confessional/thanks'
	  , formValidate = form(
			field('text').trim().required()
		)
	  , beforeRender = function(req, res, item, callback){
			if(item.confession && req.params && req.params.number){
				item.confession.text = 'This is in reply to confession #'+req.params.number+': ';
			}
			item.action = '/confessional';
			return callback(item);
	/* 		return item; */
		}
	  , beforeSave = function(req, res, item, complete){
			// Email to Beck
			// setup e-mail data with unicode symbols
			Confession.count(function(err, count){
				item.number = count+1;
	
				var mailOptions = {
			    	to: 'experimonth+confessional@lifeandscience.org', // list of receivers
			    	subject: 'New confession.', // Subject line
			    	text: 'New Confessional posted on '+moment(item.date).format('YYYY-MM-DD hh:mm A')+'\n\n---\n\n'+item.text
			    };
	
			    // send mail with defined transport object
				email.sendMail(mailOptions, null);
				
				
				if(req.user){
					// Find 5 recent events from the current user
					return Event.find({user: req.user._id}).sort('date').limit(5).exec(function(err, events){
						if(!err && events && events.length){
							item.recentEvents = events;
						}
						complete(item);
					});
				}
				return complete(item);
			});
		}
	  , layout = 'layout-confessional';
	
	app.get('/confessional', utilities.doForm(as, populate, 'Confess.', Confession, template, varNames, redirect, beforeRender, null, layout));
	app.get('/confessional/reply/:number', utilities.doForm(as, populate, 'Confess.', Confession, template, varNames, redirect, beforeRender, null, layout));
	app.post('/confessional', formValidate, utilities.doForm(as, populate, 'Confess.', Confession, template, varNames, redirect, beforeRender, beforeSave, layout));
	
	
	app.get('/confessional/thanks', function(req, res){
		res.render('confessions/thanks', {title: 'Your confession has been recorded.'});
	});
}