var mongoose = require('mongoose')
//  , mongooseAuth = require('mongoose-auth')
  , Schema = mongoose.Schema
  , email = require('../email')
  , jade = require('jade')
  , fs = require('fs')
  , moment = require('moment')
  , bcrypt = require('bcrypt')
  , crypto = require('crypto')
  , util = require('util')
  , async = require('async')
  , _ = require('underscore');



var path = __dirname + '/../views/users/email/activation.jade'
  , str = fs.readFileSync(path, 'utf8')
  , activationTemplate = jade.compile(str, { filename: path, pretty: true })
  , path = __dirname + '/../views/users/email/deactivation.jade'
  , str = fs.readFileSync(path, 'utf8')
  , deactivationTemplate = jade.compile(str, { filename: path, pretty: true })
  , path = __dirname + '/../views/users/email/confirm_email.jade'
  , str = fs.readFileSync(path, 'utf8')
  , confirmEmailTemplate = jade.compile(str, { filename: path, pretty: true })
  , path = __dirname + '/../views/users/email/reset_password.jade'
  , str = fs.readFileSync(path, 'utf8')
  , resetPasswordEmailTemplate = jade.compile(str, { filename: path, pretty: true })
  , path = __dirname + '/../views/users/email/layout.jade'
  , str = fs.readFileSync(path, 'utf8')
  , layoutTemplate = jade.compile(str, { filename: path, pretty: true });


var shouldNextUserDefend = true
  , UserSchema = new Schema({
		name: String
	  , hash: String
	  , salt: String
	  , email: String
	  , sms: String
	  
	  , timezone: {type: String, default: '0'}
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
	  , requiredAnswers: [{type: Schema.ObjectId, ref: 'ProfileAnswer'}]
	  , optionalAnswers: [{type: Schema.ObjectId, ref: 'ProfileAnswer'}]
	  , hasAnsweredAllRequiredQuestions: {type: Boolean, default: false}
	  
	  , activationCode: String
	  , fbid: String
	  , fb: Schema.Types.Mixed // FB Profile
	  , twid: String
	  , tw: Schema.Types.Mixed // Twitter Profile
	  
	  , zipcode: String
	  , birthday: String
	  , ethnicity: String
	  , gender: String
	  
		// Notification methods
	  , do_sms_notifications: {type: Boolean, default: false}
	  , do_email_notifications: {type: Boolean, default: false}
	  
	  , passwordResetTemporaryPassword: String
	  , passwordResetTimeout: Date
	})
  , User = null;


UserSchema.virtual('password').get(function (){
	return this._password;
}).set(function (password) {
	this._password = password;
	var salt = this.salt = bcrypt.genSaltSync(10);
	this.hash = bcrypt.hashSync(password, salt);
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
	  , html = resetPasswordEmailTemplate({email: this.email, base_url: base_url, activation_url: activation_url});
	html = layoutTemplate({title: 'Reset Your Password', body: html, moment: moment});

	// setup e-mail data with unicode symbols
	var mailOptions = {
	    to: this.email, // list of receivers
	    subject: 'Experimonth: Reset Your Password', // Subject line
	    generateTextFromHTML: true,
	    html: html // html body
	};
	console.log('sending: ', mailOptions);

	// send mail with defined transport object
	email.sendMail(mailOptions);
});
UserSchema.method('generateActivationCode', function(){
	this.activationCode = bcrypt.genSaltSync(10);
});
UserSchema.method('sendActivationEmail', function(){
	var theEmail = User.base64ish(this.email);
	var activationCode = User.base64ish(this.activationCode);

	var base_url = (process.env.BASEURL || 'http://app.dev:8000')
	  , activation_url = base_url + '/auth/local/confirm/'+theEmail+'/'+activationCode
	  , html = confirmEmailTemplate({email: this.email, base_url: base_url, activation_url: activation_url});
	html = layoutTemplate({title: 'Confirm Your Email Address', body: html, moment: moment});

	// setup e-mail data with unicode symbols
	var mailOptions = {
	    to: this.email, // list of receivers
	    subject: 'Experimonth: Confirm Your Email Address', // Subject line
	    generateTextFromHTML: true,
	    html: html // html body
	}

	// send mail with defined transport object
	email.sendMail(mailOptions);
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
	this.find().exec(function(err, users){
		if(err || !users || users.length == 0){
			callback(new Error('Error finding users to notify.'));
			return;
		}
		var count = users.length
		  , check = function(){
				console.log('count', count);
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
		title = 'Your Experimonth Account has been Activated!';
		html = activationTemplate({user: user});
	}else { // deactivation
		// Just round start!
		title = 'Your Experimonth Account has been Deactivated!';
		html = deactivationTemplate({user: user});
	}
	html = layoutTemplate({title: title, body: html, moment: moment});
	
	// setup e-mail data with unicode symbols
	var mailOptions = {
	    to: this.email, // list of receivers
	    subject: title, // Subject line
	    generateTextFromHTML: true,
	    html: html // html body
	}
	
	// send mail with defined transport object
	email.sendMail(mailOptions, cb);
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
	async.parallel({
		users: function(callback){
			User.find().exec(callback);
		}
	  , questions: function(callback){
			ProfileQuestion.find({published: true, required: true}).exec(callback);
		}
	  , answers: function(callback){
			ProfileAnswer.find().exec(callback);
		}
	}, function(err, results){
		if(err){
			console.log('error while computing hasAnsweredAllRequiredQuestions', arguments);
			return;
		}
		async.each(results.users, function(user, callback){
			user.reCheckProfileQuestions(results.questions, callback);
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
	var checkAnswers = function(err, questions){
		if(err || !questions || questions.length == 0){
			return callback(err);
		}
		async.map(questions, function(question, callback){
			callback(null, question._id.toString());
		}, function(err, questionIds){
			ProfileAnswer.find({user: t._id}).exec(function(err, answers){
				if(err){
					return callback(err);
				}
				var thisUsersQuestions = _.clone(questionIds);
				console.log('comparing ', thisUsersQuestions, ' to ', answers);
				for(var i=0; i<answers.length; i++){
					var idx = thisUsersQuestions.indexOf(answers[i].question.toString());
					if(idx !== -1){
						thisUsersQuestions.splice(idx, 1);
					}
				}
				console.log('result: ', thisUsersQuestions);
				if(thisUsersQuestions.length > 0){
					t.hasAnsweredAllRequiredQuestions = false;
				}else{
					t.hasAnsweredAllRequiredQuestions = true;
				}
				t.save(callback);
			});
		});
	};
	if(questions){
		checkAnswers(null, questions);
	}else{
		var ProfileQuestion = mongoose.model('ProfileQuestion')
		ProfileQuestion.find({published: true, required: true}).exec(checkAnswers);
	}
}
UserSchema.methods.checkProfileQuestions =  function(req, notComplete, complete){
	if(this.hasAnsweredAllRequiredQuestions){
		req.flash('question');
		complete();
	}else{
		var user = this
		  , ProfileQuestion = mongoose.model('ProfileQuestion')
		  , ProfileAnswer = mongoose.model('ProfileAnswer');
		ProfileQuestion.find({published: true, required: true}).exec(function(err, questions){
			if(err){
				console.log('error retrieving questions: ', arguments);
				notComplete(null, null);
				return;
			}
			ProfileAnswer.find({user: user._id}).exec(function(err, answers){
				if(err){
					console.log('error retrieving answers: ', arguments);
					notComplete(questions, null);
					return;
				}
				req.flash('question');
				if(questions.length > answers.length){
					notComplete(questions, answers);
				}else{
					complete();
				}
			});
		});
	}
};

User = mongoose.model('User', UserSchema);
// TODO: Later we'll remove this, but at startup, do the expensive work of checking whether a user hasAnsweredAllRequiredQuestions
User.reCheckAllUsersProfileQuestions();
exports = User;
