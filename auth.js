var mongoose = require('mongoose')
  , fs = require('fs')
  , jade = require('jade')
  , moment = require('moment')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , FacebookStrategy = require('passport-facebook').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy
  , OAuth2Provider = require('oauth2-provider').OAuth2Provider;

var homeRoute = '/'
  , adminEmails = ['ben.schell@gmail.com', 'ben.schell@bluepanestudio.com', 'beck@becktench.com'];

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
			  , callbackURL: (process.env.BASEURL || 'http://app.dev:8000') + '/auth/facebook/callback'
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
			  , callbackURL: (process.env.BASEURL || 'http://app.dev:8000') + '/auth/twitter/callback'
			},
			function(token, tokenSecret, profile, done) {
				User.twitterAuthenticate(profile, authenticationHandler(done));
				return;
			}
		));
		
		// TODO: Figure this out?
		// serialize user on signin
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

		app.use(function(req, res, next){
			if(req.session.impersonation_id){
				User.findById(req.session.impersonation_id, function(err, user){
					if(!err && user){
						// Override the user!
						req.original_user = req.user;
						req.user = user;
					}
					next();
				});
			}else{
				next();
			}
		});
		
		var checkProfile = function(req, res, next){
			// If the user hasn't yet finished their registration (including email address), skip the question posts.
			if(req.user.state < 2){
				return next();
			}
			if(req.hasCheckedQuestions){
				return next();
			}
			req.hasCheckedQuestions = true;
			req.user.checkProfileQuestions(req, function(requiredQuestions){
				// There are some un-answered questions!
				// Pick a random question of those that aren't answered
				var idx = Math.floor(Math.random()*requiredQuestions.length);
				var question = requiredQuestions[idx];
				app.render('profile/mixins', {question: question, answer: null, active: false}, function(err, html){
					req.flash('question', '<p><strong>Your profile is incomplete!</strong> Please answer the following question:</p>'+html);
					next();
				});
				return;
			}, function(){
				// This user has answered all the questions!
				next();
				return;
			});
			return false;
		}

		app.use(function(req, res, next){
			res.locals.url = req.url;
			var fullURL = req.protocol + "://" + req.get('host');
			if(req.user){
				// Build nav based on user role
				if(req.user.role == 10){
					res.locals.nav = [];
/*
					res.locals.nav.push({
						'name': 'Profile'
					  , 'link': fullURL+'/profile'
					});
				}else{
*/
					res.locals.nav.push({
						'name': 'Profile'
					  , 'link': '#'
					  , 'children': [
							{
								'name': 'Your Profile'
							  , 'link': fullURL+'/profile'
							}
						  , {
								'header': 'Profile Questions'
							}
						  , {
								'name': 'List'
							  , 'link': fullURL+'/profile/questions'
							}
						  , {
								'name': 'Add'
							  , 'link': fullURL+'/profile/questions/add'
							}
						]
					});
					res.locals.nav.push({
						'name': 'Experimonths'
					  , 'link': '#'
					  , 'children': [
							{
								'name': 'Currently Recruiting'
							  , 'link': fullURL+'/currently-recruiting'
							}
						  , {
								'name': 'List'
							  , 'link': fullURL+'/experimonths'
							}
						  , {
								'name': 'Add'
							  , 'link': fullURL+'/experimonths/add'
							}
						  , {
								'header': 'Kinds'
							}
						  , {
								'name': 'List'
							  , 'link': fullURL+'/experimonths/kinds'
							}
						  , {
								'name': 'Add'
							  , 'link': fullURL+'/experimonths/kinds/add'
							}
						]
					});
					res.locals.nav.push({
						'name': 'Users'
					  , 'link': '#'
					  , 'children': [
							{
								'name': 'List'
							  , 'link': fullURL+'/users'
							}
						  , {
								'header': 'Export'
							}
						  , {
								'name': 'Standard'
							  , 'link': fullURL+'/users/export'
							}
						]
					});
					res.locals.nav.push({
						'name': 'Confess'
					  , 'link': fullURL+'/confess'
					});
					res.locals.nav.push({
						'name': 'News'
					  , 'link': '#'
					  , 'children': [
							{
								'name': 'News'
							  , 'link': fullURL+'/news'
							}
						  , {
								'name': 'Add New News'
							  , 'link': fullURL+'/news/add'
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
		
		// Setup oAuth provider
		// temporary grant storage
		var myGrants = {};
		var myOAP = new OAuth2Provider({crypt_key: 'encryption secret', sign_key: 'signing secret'});

		// before showing authorization page, make sure the user is logged in
		myOAP.on('enforce_login', function(req, res, authorize_url, next) {
			if(req.user) {
				console.log('enforced login, and we were already logged in!');
				next(req.user);
			} else {
				console.log('wasn\'t logged in!');
				res.redirect('signin?next='+encodeURIComponent(authorize_url));
			}
		});
		
/*
		// render the authorize form with the submission URL
		// use two submit buttons named "allow" and "deny" for the user's choice
		myOAP.on('authorize_form', function(req, res, client_id, authorize_url) {
			res.render('authorize', {title: 'Authorize', authorize_url: authorize_url});
		});
*/
		myOAP.on('check_authorization', function(req, res, client_id, next){
			if(req.user.role >= 10){
				return next();
			}

			// Grants = Enrollment
			// Find all Experimonths that are under this kind and currently active
			var Experimonth = mongoose.model('Experimonth');
			Experimonth.findActiveQuery().populate({
				path: 'enrollments'
			  , match: {
					user: req.user._id
				}
			}).exec(function(err, experimonths){
				if(err || !experimonths || experimonths.length == 0){
					req.flash('info', 'This Experimonth is not presently active.');
					return res.redirect('/profile');
				}

				// Find an experimonth with enrollments!
				for(var i in experimonths){
					if(experimonths[i].enrollments && experimonths[i].enrollments.length > 0 && experimonths[i].kind == client_id){
						console.log('this user matches!');
						return next();
					}
				}
				req.flash('info', 'You aren\'t enrolled in that Experimonth.');
				return res.redirect('/profile');
			});
		});
		
		// save the generated grant code for the current user
		myOAP.on('save_grant', function(req, client_id, code, next) {
			if(!(req.user._id in myGrants)){
				console.log('haven\'t previously stored grants for this user, so making an object; ', req.user._id);
				myGrants[req.user._id] = {};
			}
		
			console.log('saving grant code ', code, ' for user ', req.user._id, ' and client ', client_id);
			myGrants[req.user._id][client_id] = {
				code: code
			  , date: Date.now()
			};
			next();
		});
		
		// remove the grant when the access token has been sent
		myOAP.on('remove_grant', function(user_id, client_id, code) {
			console.log('trying to remove grant code from user ', user_id, ' and client ', client_id);
			if(myGrants[user_id] && myGrants[user_id][client_id]){
				console.log('deleting!');
				delete myGrants[user_id][client_id];
			}
		});
		
		// find the user for a particular grant
		myOAP.on('lookup_grant', function(client_id, client_secret, code, next) {
			// verify that client id/secret pair are valid
			console.log('looking up grant for client_id ', client_id);
			if(client_id){
				var ExperimonthKind = mongoose.model('ExperimonthKind');
				ExperimonthKind.checkClientSecret(client_id, client_secret, function(err, kind){
					if(err || !kind){
						// Error!
						next(new Error('incorrect client credentials'));
						return;
					}

					// OK, we have a proper set of client credentials, so check our grants
					for(var user in myGrants) {
						var clients = myGrants[user];
						if(clients[client_id]){
							if(clients[client_id].code == code && clients[client_id].date + (1000 * 60 * 10) > Date.now()){
								// Grant is <10m old
								delete myGrants[user][client_id];
								return next(null, user);
							}
							delete myGrants[user][client_id];
						}
					}
					return next(new Error('no such grant found'));
				});
				return;
			}
			// We didn't have a client_id for some reason
			console.log('no such grant found');
			return next(new Error('no such grant found'));
		});
		
		// embed an opaque value in the generated access token
		myOAP.on('create_access_token', function(user_id, client_id, next) {
			console.log('creating access token');
			var data = 'blah'; // can be any data type or null
		
			next(data);
		});
		
		// (optional) do something with the generated access token
		myOAP.on('save_access_token', function(user_id, client_id, access_token) {
			console.log('saving access token %s for user_id=%s client_id=%s', access_token, user_id, client_id);
		});
		
		// an access token was received in a URL query string parameter or HTTP header
		myOAP.on('access_token', function(req, res, token, next) {
			var TOKEN_TTL = 10 * 60 * 1000; // 10 minutes
			if(token.grant_date.getTime() + TOKEN_TTL > Date.now()){
				req.token_expires = token.grant_date.getTime() + TOKEN_TTL;
				req.token_user_id = token.user_id;
				req.token_data = token.extra_data;
				return next();
			}
			
			console.warn('access token for user %s has expired', token.user_id);
			delete req.token_expires;
			delete req.token_user_id;
			delete req.token_data;
			return res.json(500, {'error': 'Access token expired!'});
		});
		
		// client credentials grant (section 4.4 of oauth2 spec)
		myOAP.on('client_credentials_auth', function(client_id, client_secret, next) {
			// In our case, every client is allowed to do Client Credentials grant
			return next(null);
		});
		
		app.use(myOAP.oauth());
		app.use(myOAP.login());
		
	}
  , route: function(app){
		var authenticateOptions = {
				successRedirect: '/auth/finish'
			  , failureRedirect: '/signin'
			  , successFlash: 'Welcome!'
			  , failureFlash: true
			}
		  , User = mongoose.model('User');

		// For Testing purposes, establish a route that determines if the user has supplied proper API credentials
		app.get('/client-is-logged-in', this.clientAuthorize, function(req, res){
			res.json({error: null, message: 'You\'ve authenticated successfully!'});
		});

		app.get('/signin', function(req, res){
			if(req.user){
				if(req.session.redirect_url){
					var url = req.session.redirect_url;
					delete req.session.redirect_url;
					return res.redirect(url);
				}

				req.flash('info', 'You are already logged in!');
				res.redirect('/profile');
				return;
			}
			if(req.param('next')){
				req.session.redirect_url = req.param('next');
			}
			res.render('signin', {title: 'Sign In'});
		});
		app.get('/register', function(req, res){
			if(req.user){
				if(req.session.redirect_url){
					var url = req.session.redirect_url;
					delete req.session.redirect_url;
					return res.redirect(url);
				}

				req.flash('info', 'You are already logged in!');
				res.redirect('/profile');
				return;
			}
			if(req.param('next')){
				req.session.redirect_url = req.param('next');
			}
			res.render('register', {title: 'Register'});
		});
		app.get('/logout', function(req, res){
			req.logOut();
			req.flash('question');
			res.redirect(homeRoute);
		});
		app.get('/auth/finish', function(req, res){
			if(req.session.redirect_url){
				var url = req.session.redirect_url;
				delete req.session.redirect_url;
				return res.redirect(url);
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
				res.redirect('/register');
				return;
			}
			User.findOne({email: email}, function(err, user){
				if(err){
					req.flash('error', 'An unexpected error occured. Please try again later.');
					res.redirect('/register');
					return;
				}
				if(user){
					req.flash('error', 'That email address is already in use.');
					res.redirect('/register');
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
						res.redirect('/register');
						return;
					}
					
					User.notifyAdmins('info', null, 'New User Registration', 'A new user (<a href="'+(process.env.BASEURL || 'http://app.dev:8000')+'/profile/'+user._id+'">'+user.email+'</a>) registered!', function(){
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
					res.redirect('/register');
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
				res.redirect('/signin');
				return;
			}
			email = User.unbase64ish(email);
			activationCode = User.unbase64ish(activationCode);
			User.findOne({email: email, activationCode: activationCode}, function(err, user){
				if(err || !user){
					req.flash('error', 'Missing or invalid parameters');
					res.redirect('/signin');
					return;
				}
/*
				if(user.activationCode != activationCode){
					req.flash('error', 'Invalid activation code!');
					res.redirect('/signin');
					return;
				}
*/
				if(user.state > 1){
					req.flash('info', 'You may now sign in below.');
					res.redirect('/signin');
					return;
				}

				// Successful!
				user.state = 2;
				user.save(function(err){
					var Notification = mongoose.model('Notification');
					Notification.notify('success', null, 'Your email address is confirmed.', 'Thank you for confirming your email address. You can now login to '+process.env.BASEURL+' and enroll in available Experimonths.', user, function(err, notification){
						if(req.user){
							res.redirect('/profile');
						}else{
							req.flash('info', 'Your email address has been confirmed. Thanks!');
							res.redirect('/signin');
						}
						
						// TODO: Merge multiple accounts?
						// We should check if there are multiple users with the same account (e.g. a user logged in with FB and Twitter with the same email address)
						// And merge them?
						return;
					});
				});
			});
		});
		app.get('/reset-password', function(req, res){
			if(req.user){
				if(req.session.redirect_url){
					var url = req.session.redirect_url;
					delete req.session.redirect_url;
					return res.redirect(url);
				}

				req.flash('info', 'You are already logged in!');
				res.redirect('/profile');
				return;
			}
			if(req.param('next')){
				req.session.redirect_url = req.param('next');
			}
			res.render('reset-password', {title: 'Reset Your Password'});
		});
		app.post('/reset-password', function(req, res){
			var email = req.param('email');
			User.findOne({email: email}, function(err, user){
				if(err || !user){
					req.flash('error', 'User not found.');
					res.redirect('/reset-password');
					return;
				}
				
				if(user.fbid){
					req.flash('error', 'You use Facebook to login to your account. Please use the \'Login with Facebook\' button below.');
					res.redirect('/signin');
					return;
				}
				if(user.twid){
					req.flash('error', 'You use Twitter to login to your account. Please use the \'Login with Twitter\' button below.');
					res.redirect('/signin');
					return;
				}

				user.generateTemporaryPassword();
				user.save(function(err){
					if(err){
						req.flash('error', 'An error occurred. Please try again.');
						res.redirect('back');
						return;
					}
					user.sendTemporaryPasswordEmail();
	
					req.flash('info', 'Please check your email for further instructions.');
					res.redirect(homeRoute);
					return;
				});
			});
		});
		app.get('/reset-password/:email/:temporaryPassword', function(req, res){
			var email = req.param('email')
			  , temporaryPassword = req.param('temporaryPassword');
			if(!email || !temporaryPassword){
				req.flash('error', 'Missing parameters' + email + '::' + temporaryPassword);
				res.redirect('/reset-password');
				return;
			}
			email = User.unbase64ish(email);
			temporaryPassword = User.unbase64ish(temporaryPassword);
			User.findOne({email: email, passwordResetTemporaryPassword: temporaryPassword}, function(err, user){
				if(err || !user){
					req.flash('error', 'Missing or invalid parameters ' + email + '::' + temporaryPassword);
					res.redirect('/reset-password');
					return;
				}
				
				if(Date.now() > user.passwordResetTimeout){
					req.flash('error', 'Your password reset attempt has expired. Please try again.');
					res.redirect('/reset-password');
					return;
				}
				
				res.render('reset-password-form', {title: 'Reset Password', user: req.user});
			});
		});
		app.post('/reset-password/:email/:temporaryPassword', function(req, res){
			var email = req.param('email')
			  , temporaryPassword = req.param('temporaryPassword');
			if(!email || !temporaryPassword){
				req.flash('error', 'Missing parameters');
					res.redirect('/reset-password');
				return;
			}
			email = User.unbase64ish(email);
			temporaryPassword = User.unbase64ish(temporaryPassword);
			User.findOne({email: email, passwordResetTemporaryPassword: temporaryPassword}, function(err, user){
				if(err || !user){
					req.flash('error', 'Missing or invalid parameters');
					res.redirect('/reset-password');
					return;
				}
				
				if(Date.now() > user.passwordResetTimeout){
					req.flash('error', 'Your password reset attempt has expired. Please try again.');
					res.redirect('/reset-password');
					return;
				}
				var password = req.param('password')
				  , confirmPassword = req.param('confirm-password')

				if(password != confirmPassword){
					req.flash('error', 'Passwords do not match!');
						res.redirect('back');
					return;
				}
				user.password = password;
				user.save(function(err){
					if(err){
						req.flash('error', 'There was an error resetting your password. '+err);
						res.redirect('back');
						return;
					}
					req.flash('info', 'Your password was successfully reset.');
					res.redirect(homeRoute);
					return;
				})
				
			});
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
				res.redirect('/signin');
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
					res.redirect('/signin');
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
		
		app.get('/profile/get', this.clientAuthorize, function(req, res, next){
			if(!req.token_user_id){
				return res.json({error: 'No User ID'});
			}
			var id = req.token_user_id;
			if(req.session.impersonation_id){
				console.log('impersonation_id');
				id = req.session.impseronation_id;
			}
			
			User.findById(id).populate('experimonths').populate('answers').exec(function(err, user){
				if(err || !user){
					console.log('user not found...');
					return res.json({error: 'User Not Found'});
				}
				return res.json({
					expires: req.token_expires
				  , user: user
				});
			});
		});
	}
  , authorizeOrSelf: function(requiredState, requiredRole, userIdParam){
		var t = this;
		return function(req, res, next){
			if(req.user && req.user._id.toString() == req.params[userIdParam]){
				return next();
			}
			(t.authorize(requiredState, requiredRole))(req, res, next);
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
			var thisRoute = homeRoute;
			if(!req.user || req.user.state < requiredState){
				if(req.user){
					if(req.user.state == 0){
						message = 'Please check your email to confirm your address. (<a href="/auth/local/register/resend/'+req.user.email+'">Resend?</a>)';
					}else if(req.user.state == 1){
						message = 'Please supply your email address to proceed.';
						thisRoute = '/profile';
					}else if(!message){
						message = 'You don\'t have permission to access that page.';
					}
				}else{
					message = 'Please sign in to access that page.';
				}
				req.flash('error', message);
				res.redirect(thisRoute);
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
			if(req.user.role >= 10 || skipQuestionCount || req.user.state < 2){
				// If we're an admin, we don't check for questions
				next();
				return;
			}
			checkProfile(req, res, next);
		};
	}
  , clientAuthorize: function(req, res, next){
		// Requre Client (API-style) Authentication 
		if(req.token_expires){
			// We have an access token!
			return next();
		}
        return res.json(401, {error: 'access_denied', message: 'Access token required!'});
	}
};