var mongoose = require('mongoose')
//  , mongooseAuth = require('mongoose-auth')
  , Schema = mongoose.Schema
  , email = require('../email')
  , fs = require('fs')
  , moment = require('moment')
  , bcrypt = require('bcrypt')
  , crypto = require('crypto')
  , util = require('util')
  , async = require('async')
  , _ = require('underscore')
  , crypto = require('crypto');


var shouldNextUserDefend = true
  , UserSchema = new Schema({
		hash: String
	  , salt: String
	  , email: String
	  , sms: String
	  
	  , timezone: {type: String, default: 'US/Eastern'}
		// STATE
		//	Replaces "active", known values:
		//	 0: Newly-registered
		//	 1: Registered, but no email provided (Twitter)
		//	 2: Email address confirmed - Fully Active
		//	 3: Email provided by external service (FB) - Fully Active
		//	10: Fully Active (manual?)
	  , state: {type: Number, default: 0}
	  , active: {type: Boolean, default: true}
	  	// ROLE
	  	// 	Replaces "isAdmin"; known values:
	  	//	 0: Basic user
	  	//	10: Admin
	  , role: {type: Number, default: 0}
	  , experimonths: [{type: Schema.ObjectId, ref: 'Experimonth'}]
	  , enrollments: [{type: Schema.ObjectId, ref: 'ExperimonthEnrollment'}]
	  , answers: [{type: Schema.ObjectId, ref: 'ProfileAnswer'}]
	  , hasAnsweredAllRequiredQuestions: {type: Boolean, default: true}
	  
	  , activationCode: String
	  , fbid: String
	  , fb: Schema.Types.Mixed // FB Profile
	  , twid: String
	  , tw: Schema.Types.Mixed // Twitter Profile
	  
		// Notification methods
	  , do_sms_notifications: {type: Boolean, default: false}
	  , do_email_notifications: {type: Boolean, default: true}
	  
	  , passwordResetTemporaryPassword: String
	  , passwordResetTimeout: Date

		// These are deprecated; they're converted to just 'answers'
	  , requiredAnswers: [{type: Schema.ObjectId, ref: 'ProfileAnswer'}]
	  , optionalAnswers: [{type: Schema.ObjectId, ref: 'ProfileAnswer'}]
	  
		// These are now deprecated as they're migrated to ProfileQuestions/Answers
	  , name: String
	  , zipcode: String
	  , birthday: String
	  , ethnicity: String
	  , gender: String
	})
  , User = null;


UserSchema.virtual('password').get(function (){
	return this._password;
}).set(function (password) {
	this._password = password;
	var salt = this.salt = bcrypt.genSaltSync(10);
	this.hash = bcrypt.hashSync(password, salt);
});

UserSchema.static('getStudyID', function(userID){
	return crypto.createHash('md5').update(userID.toString()).digest('hex');
});

UserSchema.method('verifyPassword', function(password, callback) {
	bcrypt.compare(password, this.hash, callback);
});

UserSchema.method('generateTemporaryPassword', function(){
	var id = crypto.randomBytes(20).toString('hex');
	this.passwordResetTemporaryPassword = id;
	this.passwordResetTimeout = Date.now() + (1000 * 60 * 60); // 1 hour from now
});
UserSchema.method('sendTemporaryPasswordEmail', function(){
	var theEmail = User.base64ish(this.email);
	var passwordResetTemporaryPassword = User.base64ish(this.passwordResetTemporaryPassword);

	var base_url = (process.env.BASEURL || 'http://app.dev:8000')
	  , activation_url = base_url + '/reset-password/'+theEmail+'/'+passwordResetTemporaryPassword
	  , html = 'A request was made to reset your Experimonth password. Please click the address below to complete the password reset (or copy and paste it in your browser).\n\n<a href="'+activation_url+'">'+activation_url+'</a>\n\nIf you did not request this password reset, there is no need to take any action.'

	// setup e-mail data with unicode symbols
	var mailOptions = {
	    to: [{
	    	email: this.email
	    }], // list of receivers
	    subject: 'Experimonth: Reset Your Password', // Subject line
	    html: html // html body
	};

	// send mail with defined transport object
	email.sendMail(mailOptions, this._id.toString());
});
UserSchema.method('generateActivationCode', function(){
	this.activationCode = bcrypt.genSaltSync(10);
});
UserSchema.method('sendActivationEmail', function(){
	var theEmail = User.base64ish(this.email);
	var activationCode = User.base64ish(this.activationCode);

	var base_url = (process.env.BASEURL || 'http://app.dev:8000')
	  , activation_url = base_url + '/auth/local/confirm/'+theEmail+'/'+activationCode
	  , html = 'This email address was used to sign-up for Experimonth. Please click the address below to confirm your account (or copy and paste it in your browser).\n\n<a href="'+activation_url+'">'+activation_url+'</a>\n\nIf you did not sign-up for Experimonth, there is no need to take any action.';

	// setup e-mail data with unicode symbols
	var mailOptions = {
	    to: [{
	    	email: this.email
	    }], // list of receivers
	    subject: 'Experimonth: Confirm Your Email Address', // Subject line
	    html: html // html body
	}

	// send mail with defined transport object
	email.sendMail(mailOptions, this._id.toString());
});
UserSchema.static('base64ish', function(str){
	var toReturn = new Buffer(str).toString('base64');
	toReturn = toReturn.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
	return toReturn;
});
UserSchema.static('unbase64ish', function(str){
	var toReturn = str;
	if (toReturn.length % 4 != 0){
		toReturn += ('===').slice(0, 4 - (toReturn.length % 4));
	}
	toReturn = toReturn.replace(/-/g, '+').replace(/_/g, '/');
	toReturn = new Buffer(toReturn, 'base64').toString('utf8');
	return toReturn;
});

UserSchema.static('authenticate', function(email, password, callback) {
	this.findOne({ email: email }, function(err, user) {
		if (err) { return callback(err); }
		if (!user) { return callback(null, false, 'Either your email or password was incorrect. Please try again.'); }
		user.verifyPassword(password, function(err, passwordCorrect) {
			if (err) { return callback(err, false); }
			if (!passwordCorrect) { return callback(null, false, 'Either your email or password was incorrect. Please try again.'); }
			if(user.state < 1){
				return callback(null, user, 'Please check your email to verify your email address. (<a href="/auth/local/register/resend/'+email+'">Resend?</a>)');
			}
			return callback(null, user);
		});
	});
});
UserSchema.static('facebookAuthenticate', function(profile, callback){
	console.log('fbAuth', profile);
	
	var t = this
	  , checkUser = function(user){
			if(!user.fbid){
				user.fbid = profile.id;
				user.fb = profile;
				user.markModified('fb');
				if(!user.email && profile.emails && profile.emails.length > 0){
					var email = profile.emails[0].value;
					user.email = email;
					user.state = 3;
				}
				user.save(function(err){
					if(err){ return callback(err); }
					callback(null, user);
				});
			}else{
				callback(null, user);
			}
		}
	  , findById = function(){
			t.findOne({fbid: profile.id}, function(err, user){
				if(err){ return callback(err); }
				if(user){ return checkUser(user); }

				// Register new user!
				user = new User();
				if(profile.displayName){
					user.name = profile.displayName;
				}
				if(profile.gender){
					user.gender = profile.gender;
				}
				if(profile._json.timezone){
					user.timezone = profile._json.timezone;
				}
				user.fbid = profile.id;
				var message = 'Thanks for signing up! Please fill out your profile.';
				if(profile.emails && profile.emails.length > 0){
					var email = profile.emails[0].value;
					user.email = email;
					user.state = 3;
				}else{
					user.state = 1;
					message = 'Thanks for signing up! Please supply your email address.';
				}
				user.fb = profile;
				user.markModified('fb');
				user.save(function(err, user){
					if(err){ return callback(err); }
					
					if(user.email){
						User.notifyAdmins('info', null, 'New User Registration', 'A new user (<a href="'+(process.env.BASEURL || 'http://app.dev:8000')+'/profile/'+user._id+'">'+user.email+'</a>) registered!', function(){
							callback(null, user, message);
						});
					}else{
						User.notifyAdmins('info', null, 'New User Registration', 'A new user (<a href="'+(process.env.BASEURL || 'http://app.dev:8000')+'/profile/'+user._id+'">'+user._id+'</a>) registered!', function(){
							callback(null, user, message);
						});
					}

				});
			});
		};
	if(profile.emails && profile.emails.length > 0){
		var email = profile.emails[0].value;
		t.findOne({email: email}, function(err, user){
			if(err){ return callback(err); }
			if(user){ return checkUser(user); }

			findById();
		});
	}else{
		findById();
	}
});
UserSchema.static('twitterAuthenticate', function(profile, callback){
	console.log('twitterAuth', profile);
	this.findOne({twid: profile._json.id_str}, function(err, user){
		if(err){ return callback(err); }
		if(user){ return callback(null, user); }

		// Register new user!
		user = new User();
		if(profile.displayName){
			user.name = profile.displayName;
		}
		if(profile._json.utc_offset){
			user.timezone = profile._json.utc_offset / (60 * 60);
		}
		user.twid = profile._json.id_str;
		user.state = 1;
		user.tw = profile;
		user.markModified('tw');
		user.save(function(err, user){
			if(err){ return callback(err); }

			User.notifyAdmins('info', null, 'New User Registration', 'A new user (<a href="'+(process.env.BASEURL || 'http://app.dev:8000')+'/profile/'+user._id+'">'+user._id+'</a>) registered!', function(){
				callback(null, user, 'Thanks for signing up! Please supply your email address.');
			});
		});
	});
});
UserSchema.static('notifyAdmins', function(type, format, subject, text, callback){
	var Notification = mongoose.model('Notification');
	this.find({role: 10}).exec(function(err, users){
		if(err || !users || users.length == 0){
			callback(new Error('Error finding users to notify.'));
			return;
		}
		var count = users.length
		  , check = function(){
				if(--count == 0){
					// Done iterating over users
					callback(null);
				}
			};
		users.forEach(function(user){
			Notification.notify(type, format, subject, text, user, check);
		});
	});
});
UserSchema.static('notifyAll', function(type, format, subject, text, callback){
	var Notification = mongoose.model('Notification');
	this.find({active: true}).exec(function(err, users){
		if(err || !users || users.length == 0){
			callback(new Error('Error finding users to notify.'));
			return;
		}
		var count = users.length
		  , check = function(){
				if(--count == 0){
					// Done iterating over users
					callback(null);
				}
			};
		users.forEach(function(user){
			console.log('notifying: ', user.email);
			Notification.notify(type, format, subject, text, user, check);
		});
	});
});
UserSchema.methods.notifyOfActivation = function(isActivation, cb){
	util.log('notifying '+this.email+' of deactivation');

	var html = ''
	  , title = ''
	  , user = this;
	if(isActivation){
		title = 'Your Experimonth account is activated!';
		html = 'This message is being sent to notify you that your account at '+process.env.BASEURL+' has been activated.';
	}else { // deactivation
		// Just round start!
		title = 'Your Experimonth account is deactivated!';
		html = 'This message is being sent to notify you that your account at '+process.env.BASEURL+' has been deactivated. This has happened for one of two reasons, either you are signed up for an Experimonth and haven\'t played for several days in a row; or you chose to deactivate yourself.\n\nIf you want to keep playing or believe this was done in error, please send a message to experimonth@lifeandscience.org and we\'ll get your account reactivated.';
	}
	
	// setup e-mail data with unicode symbols
	var mailOptions = {
	    to: [{
	    	email: this.email
	    }], // list of receivers
	    subject: title, // Subject line
	    html: html // html body
	}
	
	// send mail with defined transport object
	email.sendMail(mailOptions, this._id.toString());
	cb();
};
UserSchema.virtual('email_hash').get(function(){
	return crypto.createHash('md5').update(this.email.toLowerCase().trim()).digest('hex');
});

UserSchema.static('randomAdmin', function(callback) {
	this.count(function(err, count) {
		if (err) {
			return callback(err);
		}
		var rand = Math.floor(Math.random() * count);
		this.findOne().skip(rand).exec(callback);
	}.bind(this));
});
UserSchema.static('reCheckAllUsersProfileQuestions', function(finished){
	require('./ProfileQuestion');
	var ProfileQuestion = mongoose.model('ProfileQuestion')
	  , ProfileAnswer = mongoose.model('ProfileAnswer');
	User.find().exec(function(err, users){
		if(err){
			console.log('error while computing hasAnsweredAllRequiredQuestions', arguments);
			return;
		}
		async.each(users, function(user, callback){
			user.reCheckProfileQuestions(null, callback);
		}, function(err){
			console.log('did finish updating all users!');
			if(finished){
				finished();
			}
		});
	});
});
UserSchema.methods.reCheckProfileQuestions = function(questions, callback){
	var ProfileAnswer = mongoose.model('ProfileAnswer')
	  , t = this;
	t.getProfileQuestions([], function(err, requiredQuestions, requiredQuestionIds, optionalQuestions, optionalQuestionIds){
		ProfileAnswer.find({user: t._id}).exec(function(err, answers){
			for(var i=0; i<answers.length; i++){
				var idx = requiredQuestionIds.indexOf(answers[i].question.toString());
				if(idx !== -1){
					requiredQuestionIds.splice(idx, 1);
					requiredQuestions.splice(idx, 1);
				}
				idx = optionalQuestionIds.indexOf(answers[i].question.toString());
				if(idx !== -1){
					optionalQuestionIds.splice(idx, 1);
					optionalQuestions.splice(idx, 1);
				}
			}
			
			if(requiredQuestionIds.length > 0 || optionalQuestionIds.length > 0){
				t.hasAnsweredAllRequiredQuestions = false;
			}else{
				t.hasAnsweredAllRequiredQuestions = true;
			}
			t.save(function(err){
				callback(err, requiredQuestions, requiredQuestionIds, optionalQuestions, optionalQuestionIds);
			});
		});
	});
};
UserSchema.methods.getProfileQuestions = function(questionsToIgnore, callback){
	var ExperimonthEnrollment = mongoose.model('ExperimonthEnrollment')
	  , requiredQuestions = []
	  , optionalQuestions = [];
	async.eachSeries(this.enrollments, function(enrollment, callback){
		ExperimonthEnrollment.findOne({_id: enrollment}).populate('experimonth').exec(function(err, enrollment){
			if(enrollment){
				for(var idx=0; idx<enrollment.experimonth.conditions.length; idx++){
					if(questionsToIgnore.indexOf(enrollment.experimonth.conditions[idx].toString()) == -1){
						requiredQuestions.push(enrollment.experimonth.conditions[idx].toString());
					}
				}
				for(var idx=0; idx<enrollment.experimonth.requiredQuestions.length; idx++){
					if(questionsToIgnore.indexOf(enrollment.experimonth.requiredQuestions[idx].toString()) == -1){
						requiredQuestions.push(enrollment.experimonth.requiredQuestions[idx].toString());
					}
				}
				for(var idx=0; idx<enrollment.experimonth.optionalQuestions.length; idx++){
					if(questionsToIgnore.indexOf(enrollment.experimonth.optionalQuestions[idx].toString()) == -1){
						optionalQuestions.push(enrollment.experimonth.optionalQuestions[idx].toString());
					}
				}

			}
			callback();
		});
	}, function(err){
		for(var i=optionalQuestions.length-1; i>=0; i--){
			if(requiredQuestions.indexOf(optionalQuestions[i]) != -1){
				optionalQuestions.splice(i, 1);
			}
		}
		var ProfileQuestion = mongoose.model('ProfileQuestion');
		ProfileQuestion.find({_id: {$in: requiredQuestions}}).sort('-publishDate').exec(function(err, requiredQuestions){
			async.mapSeries(requiredQuestions, function(item, callback){
				callback(null, item._id.toString());
			}, function(mapErr, requiredQuestionIds){
				ProfileQuestion.find({_id: {$in: optionalQuestions}}).sort('-publishDate').exec(function(err, optionalQuestions){
					async.mapSeries(optionalQuestions, function(item, callback){
						callback(null, item._id.toString());
					}, function(mapErr, optionalQuestionIds){
						callback(err, requiredQuestions, requiredQuestionIds, optionalQuestions, optionalQuestionIds);
					});
				});
			});
		});
	});
};
UserSchema.methods.checkProfileQuestions =  function(req, notComplete, complete){
	if(this.hasAnsweredAllRequiredQuestions){
		req.flash('question');
		complete();
	}else{
		var ProfileAnswer = mongoose.model('ProfileAnswer')
		  , t = this;
		t.getProfileQuestions([], function(err, requiredQuestions, requiredQuestionIds, optionalQuestions, optionalQuestionIds){
			ProfileAnswer.find({user: t._id}).exec(function(err, answers){
				for(var i=0; i<answers.length; i++){
					var idx = requiredQuestionIds.indexOf(answers[i].question.toString());
					if(idx !== -1){
						requiredQuestionIds.splice(idx, 1);
						requiredQuestions.splice(idx, 1);
					}
				}
				for(var i=0; i<answers.length; i++){
					var idx = optionalQuestionIds.indexOf(answers[i].question.toString());
					if(idx !== -1){
						optionalQuestionIds.splice(idx, 1);
						optionalQuestions.splice(idx, 1);
					}
				}

				req.flash('question');
				if(requiredQuestionIds.length > 0 || optionalQuestionIds.length > 0){
					notComplete(requiredQuestions.concat(optionalQuestions));
				}else{
					complete();
				}
			});
		});
	}
};

User = mongoose.model('User', UserSchema);
User.reCheckAllUsersProfileQuestions();
exports = User;
