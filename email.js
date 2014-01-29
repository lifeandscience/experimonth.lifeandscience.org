var nodemailer = require('nodemailer')
  , util = require('util')
  , mongoose = require('mongoose');

var awsAccessKey = process.env.AWS_ACCESS_KEY || 'AKIAJGTS6FVN4QPODUUA'
  , awsSecret = process.env.AWS_SECRET || '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';

// create reusable transport method (opens pool of SMTP connections)
var email = nodemailer.createTransport("SES", {
	AWSAccessKeyID: awsAccessKey
  , AWSSecretKey: awsSecret
});

var currentlySending = false
  , execQueue = function(){
		if(currentlySending){
/* 			console.log('skipping because we\'re currently sending'); */
		}else{
/* 			console.log('starting to send!'); */
			// TODO: Should the email queue be persisted to the database?!
			// Grab the latest from the queue
			currentlySending = true;
			var Email = mongoose.model('Email');
			Email.find().sort('date').limit(1).exec(function(err, emails){
				if(!err && emails && emails.length > 0){
					// Send this email!
					var theEmail = emails[0];
					if('true' == process.env.DO_NOTIFICATIONS){
						email.sendMail(theEmail.ops, function(error, response){
							if(error){
								console.log('Email message not sent: ', error, response);
/* 							}else{ */
/* 								console.log("Message sent: ", theEmail.ops); */
/* 								console.log("Got a response of ", response.message); */
							}
							theEmail.remove(function(err){
								// run the queue again!
								currentlySending = false;
								execQueue();
							});
						});
					}else{
/* 						console.log('skipping due to DO_NOTIFICATIONS being disabled: ', theEmail.ops.to); */
						theEmail.remove(function(err){
							if(err){
								console.log('error removing email!', err);
							}
							// run the queue again!
							currentlySending = false;
							execQueue();
						});
					}
				}else{
					currentlySending = false;
				}
			});
		}
	};

module.exports = {
	sendMail: function(options){
		if(!options){
			options = {};
		}

		options.from = '"Experimonth" <experimonth@lifeandscience.org>';
		// Add a standard footer to each email.
		options.html += '\n\n--\n\n<a href="'+process.env.BASEURL+'">Experimonth</a> | <a href="http://twitter.com/experimonth">Twitter</a> | <a href="http://facebook.com/experimonth">Facebook</a>';
		options.html = options.html.replace(/\n/g, '<br/>');

		var Email = mongoose.model('Email')
		  , email = new Email();
		email.ops = options;
		email.markModified('ops');
		email.save(function(err){
			execQueue();
		});
	}
}