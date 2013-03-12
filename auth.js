var mongoose = require('mongoose')
  , fs = require('fs')
  , jade = require('jade')
  , moment = require('moment')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , FacebookStrategy = require('passport-facebook').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy;

var homeRoute = '/home'
  , adminEmails = ['ben.schell@gmail.com', 'ben.schell@bluepanestudio.com', 'ben@benschell.org', 'beck@becktench.com'];

module.exports = {
	setup: function(app){
		var User = mongoose.model('User')
		  , authenticationHandler = function(done){
				return function(err, user, message){
					if(err){
						done(null, false, {message: message});
						return;
					}
					if(adminEmails.indexOf(user.email) != -1 && user.role == 0){
						user.role = 10;
						user.save(function(saveErr){
							done(err, user, {message: message});
						});
						return;
					}
	/*
					if(user.state < 1){
						done('Please check your email for the link to confirm your email address and activate your account.', null);
						return;
					}
	*/
					done(err, user, {message: message});
				}
			};
		passport.use(new LocalStrategy({
				usernameField: 'email'
			}
		  , function(email, password, done) {
				User.authenticate(email, password, authenticationHandler(done));
	/*
				User.findOne({ email: email }, function(err, user) {
					if (err) { return done(err); }
					if (!user) {
						return done(null, false, { message: 'Unknown user' });
					}
					if (!user.validPassword(password)) {
						return done(null, false, { message: 'Invalid password' });
					}
					return done(null, user);
				});
	*/
			}
		));
		
		passport.use(new FacebookStrategy({
				clientID: process.env.FB_APP_ID || '265230110277521'
			  , clientSecret: process.env.FB_SECRET || '3a7fb478ebe96ed00d92ce61a0e164a8'
			  , callbackURL: (process.env.BASEURL || 'http://app.local:8000') + '/auth/facebook/callback'
			  , scope: 'email'
			},
			function(accessToken, refreshToken, profile, done) {
				if(!profile || !profile.emails || profile.emails.length == 0){
					done(new Error('Email must be provided!'), null);
					return;
				}
				User.facebookAuthenticate(profile, authenticationHandler(done));
				return;
			}
		));;

		passport.use(new TwitterStrategy({
				consumerKey: process.env.TW_CONSUMER_KEY || 'LU94k2MmBtXyp3uoAwPoA'
			  , consumerSecret: process.env.TW_CONSUMER_SECRET || 'hVBOfweBGvtoXR2b0vp5wanDqK0Wgs608bwoso9u8'
			  , callbackURL: (process.env.BASEURL || 'http://app.local:8000') + '/auth/twitter/callback'
			},
			function(token, tokenSecret, profile, done) {
				User.twitterAuthenticate(profile, authenticationHandler(done));
				return;
			}
		));
		
		// TODO: Figure this out?
		// serialize user on login
		passport.serializeUser(function(user, done) {
			done(null, user.id);
		});
		
		// TODO: Figure this out?
		// deserialize user on logout
		passport.deserializeUser(function(id, done) {
			User.findById(id, function (err, user) {
				done(err, user);
			});
		});
	
		app.use(passport.initialize());
		app.use(passport.session());
		
		var checkProfile = function(req, res, next){
			var ProfileQuestion = mongoose.model('ProfileQuestion')
			  , ProfileAnswer = mongoose.model('ProfileAnswer');
			ProfileQuestion.find({published: true}).exec(function(err, questions){
				if(err){
					console.log('error retrieving questions: ', arguments);
					next();
					return;
				}
				ProfileAnswer.find({user: req.user._id}).exec(function(err, answers){
					if(err){
						console.log('error retrieving answers: ', arguments);
						next();
						return;
					}
					console.log('questions: ', questions.length, ' answers: ', answers.length);
					req.flash('question');
					if(questions.length > answers.length){
						console.log('posing a question!');
						// There are some un-answered questions!
						// Pick a random question of those that aren't answered
						var answered = {}
						  , availableQuestions = [];
						for(var i=0; i<answers.length; i++){
							answered[answers[i].question] = true;
						}
						for(var i=0; i<questions.length; i++){
							if(!answered[questions[i]._id]){
								availableQuestions.push(questions[i]);
							}
						}
						var question = availableQuestions[Math.floor(Math.random()*availableQuestions.length)];
						app.render('profile/mixins', {question: question, answer: null, active: false}, function(err, html){
							console.log('woo?', html);
							req.flash('question', '<p><strong>Your profile is incomplete!</strong> Please answer the following question:</p>'+html);
		/* 					res.redirect('/profile'); */
							next();
						});
						return;
					}
					console.log('stopped');
					// This user has answered all the questions!
					next();
					return;
				});
			});
			return false;
		}

		app.use(function(req, res, next){
			res.locals.url = req.url;
			res.locals.nav = [
			];
			res.locals.rightNav = [
				{
					'name': 'Login'
				  , 'link': '/login'
				}
			];
			if(req.user){
				// Build nav based on user role
				res.locals.rightNav = [
					{
						'name': 'Logout'
					  , 'link': '/logout'
					}
				];
				if(req.user.role < 10){
					res.locals.nav.push({
						'name': 'Profile'
					  , 'link': '/profile'
					});
				}else{
					res.locals.nav.push({
						'name': 'Profile'
					  , 'link': '#'
					  , 'children': [
							{
								'name': 'Your Profile'
							  , 'link': '/profile'
							}
						  , {
								'header': 'Profile Questions'
							}
						  , {
								'name': 'List'
							  , 'link': '/profile/questions'
							}
						  , {
								'name': 'Add'
							  , 'link': '/profile/questions/add'
							}
						]
					});
					res.locals.nav.push({
						'name': 'Experimonths'
					  , 'link': '#'
					  , 'children': [
							{
								'name': 'List'
							  , 'link': '/experimonths'
							}
						  , {
								'name': 'Add'
							  , 'link': '/experimonths/add'
							}
						  , {
								'header': 'Kinds'
							}
						  , {
								'name': 'List'
							  , 'link': '/experimonths/kinds'
							}
						  , {
								'name': 'Add'
							  , 'link': '/experimonths/kinds/add'
							}
						]
					});
					res.locals.nav.push({
						'name': 'Users'
					  , 'link': '#'
					  , 'children': [
							{
								'name': 'List'
							  , 'link': '/users'
							}
						  , {
								'header': 'Export'
							}
						  , {
								'name': 'Standard'
							  , 'link': '/users/export'
							}
						]
					});
				}
				// Check if the user has filled out their profile!
				checkProfile(req, res, next);
				return;
			}
			next();
		});
	}
  , route: function(app){
		var authenticateOptions = {
				successRedirect: '/auth/finish'
			  , failureRedirect: '/login'
			  , successFlash: 'Welcome!'
			  , failureFlash: true
			}
		  , User = mongoose.model('User');
		app.get('/login', function(req, res){
			if(req.user){
				req.flash('info', 'You are already logged in!');
				res.redirect('/profile');
				return;
			}
			res.render('login', {title: 'Login / Register'});
		});
		app.get('/logout', function(req, res){
			req.logOut();
			res.redirect(homeRoute);
		});
		app.get('/auth/finish', function(req, res){
			if(req.session.redirect_url){
				return res.redirect(req.session.redirect_url);
			}
			return res.redirect('/profile');
		});
		
		
		// LOCAL LOGIN / REGISTRATION
		app.post('/auth/local/login', passport.authenticate('local', authenticateOptions), function(req, res) {
			// If this function gets called, authentication was successful.
			// `req.user` property contains the authenticated user.
			console.log('authentication successful!', req.user);
		});
		app.post('/auth/local/register', function(req, res){
			// TODO: implement!
			var password = req.param('password')
			  , confirmPassword = req.param('confirm-password')
			  , email = req.param('email');
			if(password != confirmPassword){
				req.flash('error', 'Passwords do not match!');
				res.redirect('/login');
				return;
			}
			User.findOne({email: email}, function(err, user){
				if(err){
					req.flash('error', 'An unexpected error occured. Please try again later.');
					res.redirect('/login');
					return;
				}
				if(user){
					req.flash('error', 'That email address is already in use.');
					res.redirect('/login');
					return;
				}
				// Email address wasn't found, password seems to be good. Let's save!
				user = new User();
				user.email = email;
				user.password = password;
				user.generateActivationCode();
				user.save(function(err){
					if(err){
						req.flash('error', 'There was an error during registration. Please try again.');
						res.redirect('/login');
						return;
					}
					
					User.notifyAdmins('A new user (<a href="'+(process.env.BASEURL || 'http://app.local:8000')+'/profile/'+user._id+'">'+user.email+'</a>) registered!', function(){
						// Successful!
						// They need to activate the account?
						// Send an email to spur activation
						user.sendActivationEmail();
						
						req.flash('info', 'Registration successful! Please check your email for further instructions.');
						res.redirect(homeRoute);
					});
					return;
				});
			});
		});
		app.get('/auth/local/register/resend/:email', function(req, res){
			var email = req.param('email');
			User.findOne({email: email}, function(err, user){
				if(err || !user){
					req.flash('error', 'User not found.');
					res.redirect('/login');
					return;
				}

				user.sendActivationEmail();

				req.flash('info', 'Please check your email for further instructions.');
				res.redirect(homeRoute);
				return;
			});
		});
		app.get('/auth/local/confirm/:email/:activationCode', function(req, res){
			var email = req.param('email')
			  , activationCode = req.param('activationCode');
			if(!email || !activationCode){
				req.flash('error', 'Missing parameters');
				res.redirect('/login');
				return;
			}
			email = new Buffer(email, 'base64').toString('utf8');
			activationCode = new Buffer(activationCode, 'base64').toString('utf8');
			User.findOne({email: email, activationCode: activationCode}, function(err, user){
				if(err || !user){
					req.flash('error', 'Missing or invalid parameters');
					res.redirect('/login');
					return;
				}
/*
				if(user.activationCode != activationCode){
					req.flash('error', 'Invalid activation code!');
					res.redirect('/login');
					return;
				}
*/
				if(user.state > 1){
					req.flash('info', 'You may now login below.');
					res.redirect('/login');
					return;
				}

				// Successful!
				user.state = 2;
				user.save(function(err){
					user.notify('Thanks for confirming your email address!', function(err){
						if(req.user){
							req.flash('info', 'Your email address was confirmed!');
							res.redirect('/profile');
						}else{
							req.flash('info', 'Your email address was confirmed! You may now login.');
							res.redirect('/login');
						}
						
						// TODO: Merge multiple accounts?
						// We should check if there are multiple users with the same account (e.g. a user logged in with FB and Twitter with the same email address)
						// And merge them?
						return;
					});
				});
			})
		});
		
		// Redirect the user to Facebook for authentication.  When complete,
		// Facebook will redirect the user back to the application at
		// /auth/facebook/callback
		app.get('/auth/facebook', passport.authenticate('facebook'));
		
		// Facebook will redirect the user to this URL after approval.  Finish the
		// authentication process by attempting to obtain an access token.  If
		// access was granted, the user will be logged in.  Otherwise,
		// authentication has failed.
		app.get('/auth/facebook/callback', passport.authenticate('facebook', authenticateOptions));

		// Redirect the user to Twitter for authentication.  When complete, Twitter
		// will redirect the user back to the application at
		// /auth/twitter/callback
		app.get('/auth/twitter', passport.authenticate('twitter'));
		
		// Twitter will redirect the user to this URL after approval.  Finish the
		// authentication process by attempting to obtain an access token.  If
		// access was granted, the user will be logged in.  Otherwise,
		// authentication has failed.
		app.get('/auth/twitter/callback', passport.authenticate('twitter', authenticateOptions));
		
		
		app.post('/auth/addEmail', function(req, res){
			// TODO: implement!
			var email = req.param('email');
			if(!req.user){
				// How did this happen?!
				req.flash('error', 'You must be logged in to add your email address!');
				res.redirect('/login');
				return;
			}
			if(!email){
				req.flash('error', 'Please input your email address!');
				res.redirect('/profile');
				return;
			}
			req.user.email = email;
			req.user.state = 0;
			req.user.generateActivationCode();
			req.user.save(function(err){
				if(err){
					req.flash('error', 'There was an error during registration. Please try again.');
					res.redirect('/login');
					return;
				}
				// Successful!
				// They need to activate the account?
				// Send an email to spur activation
				req.user.sendActivationEmail();
				
				req.flash('info', 'Your email was successfully added! Please check your email for further instructions.');
				res.redirect(homeRoute);
				return;
			});
		});
	}
  , authorizeOrSelf: function(requiredState, requiredRole, userIdParam){
		return function(req, res, next){
			if(req.user && req.user._id.toString() == req.params[userIdParam]){
				return next();
			}
			(this.authorize(requiredState, requiredRole))(req, res, next);
		};
	}
  , authorize: function(requiredState, requiredRole, message, skipQuestionCount){
		if(!requiredState){
			requiredState = 0;
		}
		if(!requiredRole){
			requiredRole = 0;
		}
		return function(req, res, next){
			if(!req.user || req.user.state < requiredState){
				if(!message){
					if(req.user && req.user.state == 0){
						message = 'Please check your email to confirm your address. (<a href="/auth/local/register/resend/'+req.user.email+'">Resend?</a>)';
					}else{
						message = 'Please login to access that page.';
					}
				}
				req.flash('error', message);
				res.redirect(homeRoute);
				return;
			}
			if(!req.user || req.user.role < requiredRole){
				if(!message){
					message = 'You are not authorized to view that page!';
				}
				req.flash('error', message);
				res.redirect(homeRoute);
				return;
			}
			// We're authorized!
			// No longer calling checkProfile
//			console.log('cleared!', arguments);
			next();
			return;
			
			
			
			

			// Check if we need to answer questions
			if(req.user.role >= 10 || skipQuestionCount){
				// If we're an admin, we don't check for questions
				next();
				return;
			}
			checkProfile(req, res, next);
		};
	}
};