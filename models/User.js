var mongoose = require('mongoose')
//  , mongooseAuth = require('mongoose-auth')
  , Schema = mongoose.Schema
  , email = require('../email')
  , jade = require('jade')
  , fs = require('fs')
  , moment = require('moment')
  , bcrypt = require('bcrypt')
  , crypto = require('crypto')
  , util = require('util');



var path = __dirname + '/../views/users/email/activation.jade'
  , str = fs.readFileSync(path, 'utf8')
  , activationTemplate = jade.compile(str, { filename: path, pretty: true })
  , path = __dirname + '/../views/users/email/deactivation.jade'
  , str = fs.readFileSync(path, 'utf8')
  , deactivationTemplate = jade.compile(str, { filename: path, pretty: true })
  , path = __dirname + '/../views/users/email/confirm_email.jade'
  , str = fs.readFileSync(path, 'utf8')
  , confirmEmailTemplate = jade.compile(str, { filename: path, pretty: true })
  , path = __dirname + '/../views/users/email/layout.jade'
  , str = fs.readFileSync(path, 'utf8')
  , layoutTemplate = jade.compile(str, { filename: path, pretty: true });


var shouldNextUserDefend = true
  , UserSchema = new Schema({
		name: String
	  , hash: String
	  , salt: String
	  , email: String
	  
	  , timezone: {type: Number, default: 0}
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
	  
	  , activationCode: String
	  , fbid: String
	  , fb: Schema.Types.Mixed // FB Profile
	  , twid: String
	  , tw: Schema.Types.Mixed // Twitter Profile
	  
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

UserSchema.method('verifyPassword', function(password, callback) {
	bcrypt.compare(password, this.hash, callback);
});

UserSchema.method('generateActivationCode', function(){
	this.activationCode = bcrypt.genSaltSync(10);
});
UserSchema.method('sendActivationEmail', function(){
	var base_url = (process.env.BASEURL || 'http://app.local:8000')
	  , activation_url = base_url + '/auth/local/confirm/'+new Buffer(this.email).toString('base64')+'/'+new Buffer(this.activationCode).toString('base64')
	  , html = confirmEmailTemplate({email: this.email, base_url: base_url, activation_url: activation_url});
	html = layoutTemplate({title: 'Confirm Your Email Address', body: html, moment: moment});

	// setup e-mail data with unicode symbols
	var mailOptions = {
	    from: "Experimonth: Frenemy <experimonth@lifeandscience.org>", // sender address
	    to: this.email, // list of receivers
	    subject: 'Frenemy: Confirm Your Email Address', // Subject line
	    generateTextFromHTML: true,
	    html: html // html body
	}

	// send mail with defined transport object
	email.sendMail(mailOptions);
});
UserSchema.method('notify', function(message, callback){
	if(!message){
		return callback(new Error('Can\t notify without a message!'));
	}
	var Notification = mongoose.model('Notification')
	  , n = new Notification();
	n.text = message;
	n.user = this;
	n.save(function(err){
		if(err){ return callback(new Error('Trouble saving new notification!')); }
		callback(null);
	});
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
						User.notifyAdmins('A new user (<a href="'+(process.env.BASEURL || 'http://app.local:8000')+'/profile/'+user._id+'">'+user.email+'</a>) registered!', function(){
							callback(null, user, message);
						});
					}else{
						User.notifyAdmins('A new user (<a href="'+(process.env.BASEURL || 'http://app.local:8000')+'/profile/'+user._id+'">'+user._id+'</a>) registered!', function(){
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

			User.notifyAdmins('A new user (<a href="'+(process.env.BASEURL || 'http://app.local:8000')+'/profile/'+user._id+'">'+user._id+'</a>) registered!', function(){
				callback(null, user, 'Thanks for signing up! Please supply your email address.');
			});
		});
	});
});
UserSchema.static('notifyAdmins', function(notification, callback){
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
			user.notify(notification, check);
		});
	});
});
UserSchema.static('notifyAll', function(notification, callback){
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
			user.notify(notification, check);
		});
	});
});

UserSchema.methods.notifyOfActivation = function(isActivation, cb){
	util.log('notifying '+this.email+' of deactivation');

	if(process.env.DO_NOTIFICATIONS){
		util.log('will DO_NOTIFICATIONS');
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
		    from: "Experimonth: Frenemy <experimonth@lifeandscience.org>", // sender address
		    to: this.email, // list of receivers
		    subject: title, // Subject line
		    generateTextFromHTML: true,
		    html: html // html body
		}
		
		// send mail with defined transport object
		email.sendMail(mailOptions, cb);
	}else if(cb){
		cb();
	}
};
UserSchema.virtual('email_hash').get(function(){
	return crypto.createHash('md5').update(this.email.toLowerCase().trim()).digest('hex');
});

User = mongoose.model('User', UserSchema);
exports = User;
