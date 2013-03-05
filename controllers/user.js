
/*
	app.get('/profile', function(req, res){
		res.render('index', { title: 'Express' });
	});
*/

var form = require('express-form')
  , field = form.field
  , utilities = require('../utilities')
  , mongoose = require('mongoose')
  , User = mongoose.model('User')
  , csv = require('csv')
  , moment = require('moment')
  , util = require('util')
  , auth = require('../auth');

module.exports = function(app){
	app.get('/users', auth.authorize(2, 10), function(req, res){
		User.find({}).sort('name').exec(function(err, users){
			res.render('users/index', {title: 'All Users', users: users, moment: moment});
		});
	});
	
	/*
	// Saving for now.
	app.get('/users/defending', auth.authorize(2, 10), function(req, res){
		User.find({defending:true}).sort('name').exec(function(err, users){
			res.render('users/index', {title: 'All Users', users: users, moment: moment});
		});
	});
	app.get('/users/nondefending', auth.authorize(2, 10), function(req, res){
		User.find({defending:false}).sort('name').exec(function(err, users){
			res.render('users/index', {title: 'All Users', users: users, moment: moment});
		});
	});
	*/
	
	// (as, populate, title, object, template, varNames, redirect, beforeRender, beforeSave)
	var as = 'user'
	  , populate = 'votes'
	  , template = 'users/form'
	  , varNames = ['email', 'name', 'twitter', 'facebook', 'flickr', 'tumblr', 'youtube']
	  , redirect = 'back'
	  , formValidate = form(
			field('email').trim()
		  , field('name').trim()
		  , field('twitter').trim()
		  , field('facebook').trim()
		  , field('flickr').trim()
		  , field('tumblr').trim()
		  , field('youtube').trim()
		);
	
	/*
	// Saving for now.
	app.get('/users/add', auth.authorize(2, 10), utilities.doForm(as, populate, 'Add New User', User, template, varNames, redirect));
	app.post('/users/add', auth.authorize(2, 10), formValidate, utilities.doForm(as, populate, 'Add New User', User, template, varNames, redirect));
	*/
	app.get('/users/edit/:id', auth.authorize(2, 10), utilities.doForm(as, populate, 'Edit User', User, template, varNames, redirect));
	app.post('/users/edit/:id', auth.authorize(2, 10), formValidate, utilities.doForm(as, populate, 'Edit User', User, template, varNames, redirect));
	
	/*
	// Saving for now.
	app.get('/users/generate', auth.authorize(2, 10), function(req, res){
		req.flash('error', 'Number of users to generate is required.');
		res.redirect('/users');
		return;
	});
	app.get('/users/generate/:num', auth.authorize(2, 10), function(req, res){
		// Generate 6 users
		if(!req.params.num){
			req.flash('error', 'Number of users to generate is required.');
			res.redirect('/users');
			return;
		}
		var count = 0;
		for(var i=0; i<parseFloat(req.params.num); i++){
			var user = new User();
			user.name = 'Ben Schell ('+i+')';
			user.email = 'ben.schell+frenemy'+i+'@bluepanestudio.com';
			count++;
			user.save(function(err){
				if(--count == 0){
					req.flash('info', 'Users generated successfully!');
					res.redirect('/users');
				}
			});
		}
	});
	*/
	app.post('/users/opt_out', auth.authorize(2, 10), function(req, res){
		req.user.opt_out = req.param('opt_out') == 'on';
		console.log('params: ', req.params);
		req.user.save(function(err){
			if(err){
				req.flash('error', 'There was an error while saving your opt-out state.');
				res.redirect('back');
				return;
			}
			req.flash('info', 'Your preference has been saved.');
			res.redirect('back');
			return;
		});
	});
	app.get('/users/promote/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			res.send(404);
			return;
		}
		User.update({_id: req.params.id}, {$set: {role: 10}}, {}, function(){
			req.flash('info', 'User Promoted!');
			res.redirect('/users');
		});
	});
	app.get('/users/demote/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			res.send(404);
			return;
		}
		User.update({_id: req.params.id}, {$set: {role: 0}}, {}, function(){
			req.flash('info', 'User Demoted!');
			res.redirect('/users');
		});
	});
	app.get('/users/activate/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			res.send(404);
			return;
		}
		User.findById(req.params.id).exec(function(err, user){
	/* 	User.update({_id: req.params.id}, {$set: {active: true}}, {}, function(){ */
			user.active = true;
			user.save();
			user.notifyOfActivation(true, function(){
				util.log('activated: '+util.inspect(arguments));
				req.flash('info', 'User Activated!');
				res.redirect('/users');
			});
		});
	});
	app.get('/users/deactivate/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			res.send(404);
			return;
		}
		User.findById(req.params.id).exec(function(err, user){
			console.log('err: ', err, user);
			user.active = false;
			user.save(function(){
				user.notifyOfActivation(false, function(){
					util.log('activated: '+util.inspect(arguments));
					req.flash('info', 'User De-activated!');
					res.redirect('/users');
				});
			});
		});
	/*
		User.update({_id: req.params.id}, {$set: {active: false}}, {}, function(){
			req.flash('info', 'User De-activated!');
			res.redirect('/users');
		});
	*/
	});
	
	app.get('/users/export', auth.authorize(2, 10), function(req, res, next){
		var start = Date.now();
		util.log('starting the log up! '+start);
		// Export all game data as a CSV
		var User = mongoose.model('User');
	
	/* 	res.contentType('.csv'); */
	
		var csv = 'name\temail\tID\tuser type\tuser score\tBirthdate\tZip\tGender\tEthnicity\tColor\tTransport\tSports\tPersonality\tPolitics\tGlasses\tPets\tBirthplace\n';
		
		res.writeHead(200, {
			'Content-Type': 'text/tsv',
			'Content-Disposition': 'attachment;filename=user-export-all.tsv'
		});
		
		res.write(csv);
	
		var numUsers = 0
		  , stream = null
		  , totallyDone = false
		  , checkDone = function(){
				if(--numUsers == 0){
					if(totallyDone){
						util.log('totally done!');
						if(hasFoundUser){
							// We found at least one game
							// Maybe the query needs to be re-run starting at an offset of offset
							createQueryStream(offset);
						}else{
							res.end();
						}
					}
				}
			}
		  , hasFoundUser = false
		  , offset = 0
		  , games = {}
		  , queryDataFunction = function(user){
		  		++offset;
	
		  		++numUsers;
		  		hasFoundUser = true;
				var addToCSV = user.name + '\t' + user.email + '\t' + user._id + '\t' + (user.defending ? 'defending' : 'accumulating') + '\t' + user.score + '\t' + user.Birthdate + '\t' + user.Zip + '\t' + user.Gender + '\t' + user.Ethnicity + '\t' + user.Color + '\t' + user.Transport + '\t' + user.Sports + '\t' + user.Personality + '\t' + user.Politics + '\t' + user.Glasses + '\t' + user.Pets + '\t' + user.Birthplace + '\n';
				// Determine which of the users was this one in the round
				res.write(addToCSV);
				checkDone();
			}
		  , queryErrorFunction = function(){
				res.end();
			}
		  , queryCloseFunction = function(){
				totallyDone = true;
				++numUsers;
				checkDone();
			}
		  , createQueryStream = function(skip){
		  		var query = User.find().sort('name');
		  		if(skip){
			  		query.skip(skip);
		  		}
		  		hasFoundUser = false;
		  		stream = query.stream();
				stream.on('data', queryDataFunction);
				stream.on('error', queryErrorFunction);
				stream.on('close', queryCloseFunction); //.run(function(err, games){
		  	};
		createQueryStream();
		return;
	});
	
	/*
	// Saving for now.
	app.get('/users/resetScores/d23bd87', auth.authorize(2, 10), function(req, res, next){
		User.update({defending: true}, { $set: { score: 10000 }}, { multi: true }, function(){
			util.log('did reset defending users!');
			util.log(util.inspect(arguments));
	
			User.update({defending: false}, { $set: { score: 0 }}, { multi: true }, function(){
				util.log('did reset accumulating users!');
				util.log(util.inspect(arguments));
	
				req.flash('error', 'User scores reset!');
				res.redirect('/users');
			});
		});
	});
	*/
};