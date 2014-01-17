var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , util = require('util')
  , async = require('async')
  , email = require('../email');

var NotificationSchema = new Schema({
	date: {type: Date, default: function(){ return new Date(); }}
  , type: {type: String, enum: ['warning', 'error', 'success', 'info'], default: 'warning'}
  , read: {type: Boolean, default: false}
  , text: String
  , subject: String
  , format: [{type: String, enum: ['web', 'email', 'sms']}]
  , email_sent: {type: Boolean, default: false}
  , sms_sent: {type: Boolean, default: false}
  , user: {type: Schema.ObjectId, ref: 'User'}
});

NotificationSchema.pre('save', function(next){
	if(!this.format || this.format.length == 0){
		// TODO: Set this.format based on User preferences?
		this.format = ['web', 'email'];
	}
	var toDoParallel = null;
	if(this.format && this.format.length && this.format.indexOf('email') !== -1 && !this.email_sent){
		// This is an email notification!
		// TODO: Send an email
		// TODO: DO: this.email_sent = true;
		var t = this;
		if(!toDoParallel){
			toDoParallel = {};
		}
		toDoParallel.email = function(callback){
			var finish = function(user){
				if(user.email){
					var html = t.text + '<small>If you would like to be unsubscribed from these notifications, login to '+process.env.BASEURL+' and uncheck the "Email Notifications" option on your profile page.</small>';
					var mailOptions = {
						to: user.email,
						subject: t.subject,
						generateTextFromHTML: true,
						html: html
					};
		
					// send mail with defined transport object
					email.sendMail(mailOptions, function(){
						t.email_sent = true;
						callback();
					});
				}else{
					console.log('would\'ve emailed the user but they had no email address!');
					callback();
				}
			};

			if(t.user && !t.user._id){
				var User = mongoose.model('User');
				User.findById(t.user).exec(function(err, user){
					finish(user);
				});
			}else{
				finish(t.user);
			}
		};
	}
	if(this.format && this.format.length && this.format.indexOf('sms') !== -1 && !this.sms_sent){
		// This is an SMS notification!
		// TODO: Send the text message
		// TODO: DO: this.sms_sent = true;
	}
	if(toDoParallel){
		async.parallel(toDoParallel, function(err, results){
			if(err){
				console.log('Error while saving Notification: ', err);
			}
			next();
		});
	}else{
		next();
	}
});

NotificationSchema.static('notify', function(type, format, subject, text, user, callback){
	if(!text){
		return callback(new Error('Can\t notify without a message!'), null);
	}
	var n = new this();
	n.type = type;
	n.format = format;
	n.subject = subject;
	n.text = text;
	n.user = user;
	n.save(callback);
});

var Notification = mongoose.model('Notification', NotificationSchema);
exports = Notification;