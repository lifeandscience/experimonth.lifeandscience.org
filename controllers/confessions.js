var form = require('express-form')
  , field = form.field
  , utilities = require('../utilities')
  , mongoose = require('mongoose')
  , Confession = mongoose.model('Confession')
  , Event = mongoose.model('Event')
  , User = mongoose.model('User')
  , moment = require('moment')
  , email = require('../email')
  , util = require('util')
  , auth = require('../auth')
  , crypto = require('crypto');

module.exports = function(app){
	app.get('/confessional', function(req, res){
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
	
	app.get('/confessional/numberExisting', auth.authorize(2, 10), function(req, res){
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
			res.redirect('back');
		});
	});
	
	app.get('/confessional/flag/:id', function(req, res){
		if(!req.params.id){
			req.flash('error', 'Confession ID required.');
			res.redirect('back');
			return;
		}
		Confession.findById(req.params.id).exec(function(err, confession){
			if(err || !confession){
				req.flash('error', 'Confession not found.');
				res.redirect('back');
				return;
			}
			confession.flags++;
			confession.save(function(err){
	
				var mailOptions = {
			    	to: [{
			    		email: 'experimonth+confessional@lifeandscience.org'
			    	}], // list of receivers
			    	subject: 'Flagged Confession.', // Subject line,
					generateTextFromHTML: true,
					html: 'Confessional #'+confession.number+' was flagged, bringing it\'s total number of flags to '+confession.flags+' on '+moment().format('YYYY-MM-DD hh:mm A')+'\n\n---\n\n'+confession.text
			    };
	
			    // send mail with defined transport object
				email.sendMail(mailOptions);
	
				req.flash('info', 'Confession flagged.');
				res.redirect('back');
				return;
			});
			return;
		});
	});
	
	app.get('/confessional/promote/:id', function(req, res){
		if(!req.params.id){
			req.flash('error', 'Confession ID required.');
			res.redirect('back');
			return;
		}
		Confession.findById(req.params.id).exec(function(err, confession){
			if(err || !confession){
				req.flash('error', 'Confession not found.');
				res.redirect('back');
				return;
			}
			confession.promoted = !confession.promoted;
			confession.save(function(err){
				req.flash('info', 'Confession '+(confession.promoted ? 'promoted.' : 'demoted.'));
				res.redirect('back');
				return;
			});
			return;
		});
	});
	
	app.get('/confessional/publish/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			req.flash('error', 'Confession ID required.');
			res.redirect('back');
			return;
		}
		Confession.findById(req.params.id).exec(function(err, confession){
			if(err || !confession){
				req.flash('error', 'Confession not found.');
				res.redirect('back');
				return;
			}
			confession.active = true;
			confession.save(function(err){
				req.flash('info', 'Confession published.');
				res.redirect('back');
				return;
			});
			return;
		});
	});
	
	app.get('/confessional/unpublish/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			req.flash('error', 'Confession ID required.');
			res.redirect('back');
			return;
		}
		Confession.findById(req.params.id).exec(function(err, confession){
			if(err || !confession){
				req.flash('error', 'Confession not found.');
				res.redirect('back');
				return;
			}
			confession.active = false;
			confession.save(function(err){
				req.flash('info', 'Confession unpublished.');
				res.redirect('back');
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
	  , redirect = '/confess/thanks'
	  , formValidate = form(
			field('text').trim().required()
		)
	  , beforeRender = function(req, res, item, callback){
			res.locals.timestamp = Date.now();
			res.locals.nonce = crypto.createHash('md5').update(''+res.locals.timestamp).digest('hex');
			
			if(item.confession && req.params && req.params.number){
				item.confession.text = 'This is in reply to confession #'+req.params.number+': ';
			}
			item.action = '/confess';
			if(req.params.number){
				Confession.find({number: req.params.number}).exec(function(err, confessions){
					if(!err && confessions && confessions.length){
						item.random_confession = confessions[0];
						return callback(item);
					}
					Confession.findRandom(req.user, function(confession){
						item.random_confession = confession;
						return callback(item);
					});
				});
			}else{
				Confession.findRandom(req.user, function(confession){
					item.random_confession = confession;
					return callback(item);
				});
			}
	/* 		return item; */
		}
	  , beforeSave = function(req, res, item, complete){
			if(!req.body.whatareyou || req.body.whatareyou != 'hewmahn'){
				req.flash('error', 'Form not submitted correctly. Try again.');
				return res.redirect('back');
			}
			if(!req.body.timestamp || !req.body.nonce){
				req.flash('error', 'Form not submitted correctly. Try again.');
				return res.redirect('back');
			}
			if(crypto.createHash('md5').update(''+req.body.timestamp).digest('hex') != req.body.nonce){
				req.flash('error', 'Form not submitted correctly. Try again.');
				return res.redirect('back');
			}
			
			// Email to Beck
			// setup e-mail data with unicode symbols
			Confession.count(function(err, count){
				item.number = count+1;
	
				var mailOptions = {
					to: [{
						email: 'experimonth+confessional@lifeandscience.org'
					}], // list of receivers
			    	subject: 'New confession.', // Subject line,
					html: 'New Confessional posted on '+moment(item.date).format('YYYY-MM-DD hh:mm A')+'\n\n---\n\n'+item.text
			    };
	
			    // send mail with defined transport object
				email.sendMail(mailOptions);
				
				
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
	
	app.get('/confess', utilities.doForm(as, populate, 'Confess.', Confession, template, varNames, redirect, beforeRender, null, layout));
	app.get('/confess/reply/:number', utilities.doForm(as, populate, 'Confess.', Confession, template, varNames, redirect, beforeRender, null, layout));
	app.post('/confess', formValidate, utilities.doForm(as, populate, 'Confess.', Confession, template, varNames, redirect, beforeRender, beforeSave, layout));
	
	
	app.get('/confess/thanks', function(req, res){
		res.render('confessions/thanks', {title: 'Your confession has been recorded.'});
	});
	app.get('/confess/random', function(req, res){
		Confession.findRandom(req.user, function(confession){
			return res.render('confessions/single_confession', {confession: confession});
		});
	});
	
	app.get('/confessional/export', auth.authorize(2, 10), function(req, res){
		res.writeHead(200, {
			'Content-Type': 'text/tsv',
			'Content-Disposition': 'attachment;filename=confessions.tsv'
		});
		var csv = 'ID\tNumber\tText\tTimestamp\tIs Active\tIs Promoted\tNumber of Flags\tEvent #1 Name\tEvent #1 Value\tEvent #2 Name\tEvent #2 Value\tEvent #3 Name\tEvent #3 Value\tEvent #4 Name\tEvent #4 Value\tEvent #5 Name\tEvent #5 Value\n';
		res.write(csv);

		var numConfessions = 0
		  , stream = null
		  , totallyDone = false
		  , checkDone = function(){
				if(--numConfessions == 0){
					if(totallyDone){
						util.log('totally done.');
						if(hasFoundConfession){
							// We found at least one game
							// Maybe the query needs to be re-run starting at an offset of offset
							createQueryStream(offset);
						}else{
							res.end();
						}
					}
				}
			}
		  , hasFoundConfession = false
		  , offset = 0
		  , userTransformableValues = [
				'frenemy:walkaway',
				'frenemy:walkedAwayFrom',
				'frenemy:viewedCompletedRoundScreen',
				'frenemy:startGame'
			]
		  , queryDataFunction = function(confession){
		  		++offset;
	
		  		++numConfessions;
		  		hasFoundConfession = true;
		  		
		  		var addToCSV = [
		  			confession._id
		  		  , confession.number
		  		  , '"'+confession.text.replace(/"/g, '\"')+'"'
		  		  , moment(confession.date).format('YYYY-MM-DD hh:mm A')
		  		  , confession.active ? 'Active' : 'Inactive'
		  		  , confession.promoted ? 'Promoted' : 'Not Promoted'
		  		  , confession.flags
		  		];
		  		if(confession.recentEvents && confession.recentEvents.length){
			  		for(var i=0; i<confession.recentEvents.length; i++){
			  			addToCSV.push(confession.recentEvents[i].name);
						if(userTransformableValues.indexOf(confession.recentEvents[i].name) != -1){
							addToCSV.push(User.getStudyID(confession.recentEvents[i].value));
						}else{
							addToCSV.push(confession.recentEvents[i].value);
						}
			  		}
			  	}
			  	addToCSV = addToCSV.join('\t') + '\n';

				// Determine which of the users was this one in the round
				res.write(addToCSV);
				checkDone();
			}
		  , queryErrorFunction = function(){
				res.end();
			}
		  , queryCloseFunction = function(){
				totallyDone = true;
				++numConfessions;
				checkDone();
			}
		  , createQueryStream = function(skip){
		  		var query = Confession.find().populate('recentEvents').sort('date');
		  		if(skip){
			  		query.skip(skip);
		  		}
		  		hasFoundConfession = false;
		  		stream = query.stream();
				stream.on('data', queryDataFunction);
				stream.on('error', queryErrorFunction);
				stream.on('close', queryCloseFunction); //.run(function(err, games){
		  	};
		createQueryStream();
		return;
	});
}