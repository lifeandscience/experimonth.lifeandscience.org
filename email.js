var nodemailer = require('nodemailer')
  , util = require('util');

var awsAccessKey = process.env.AWS_ACCESS_KEY || 'AKIAJGTS6FVN4QPODUUA'
  , awsSecret = process.env.AWS_SECRET || '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';

// create reusable transport method (opens pool of SMTP connections)
var email = nodemailer.createTransport("SES", {
	AWSAccessKeyID: awsAccessKey
  , AWSSecretKey: awsSecret
});

var emailQueue = []
  , emailsInFlight = 0
  , currentEmail = null
  , lastSendingTime = null
  , lastSendingTimeCount = 0
  , numEmailsPerSecond = 4
  , execQueue = function(){
		// TODO: Should the email queue be persisted to the database?!
		// Grab the latest from the queue
		if(emailQueue.length > 0 && emailsInFlight < numEmailsPerSecond){
			var currentTime = Math.floor(Date.now()/1000);
			if(currentTime == lastSendingTime){
				// Check the count and possibly sleep
				if(lastSendingTimeCount == numEmailsPerSecond){
					// We've met our rate
					// Sleep / postpone this iteration
					setTimeout(execQueue, 1000);
					return;
				}
				// We're below the max rate, so just increment and continue along.
				lastSendingTimeCount++;
			}else{
				// We're at a new time interval, so we can update the time
				lastSendingTime = currentTime;
				lastSendingTimeCount = 1;
			}
		
		
			var mail = emailQueue.shift();
			emailsInFlight++;
			// Send the email
			email.sendMail(mail.options, function(error, response){
			    if(error){
			        util.log('Email message not sent: ', error);
			    }else{
			        util.log("Message sent: ", mail.options);
			        util.log("Got a response of ", response.message);
			    }
			    if(mail.callback){
			    	mail.callback();
			    }
			    emailsInFlight--;
			    execQueue();
			});
		}
	};

module.exports = {
	sendMail: function(options, callback){
		if('true' == process.env.DO_NOTIFICATIONS){
			options.from = '"Experimonth" <experimonth@lifeandscience.org>';
			
			// Add a standard footer to each email.
			options.html += '\n\n--\n\n<a href="'+process.env.BASEURL+'">Experimonth</a> | <a href="http://twitter.com/experimonth">Twitter</a> | <a href="http://facebook.com/experimonth">Facebook</a>';
			options.html = options.html.replace('\n', '<br/>');

			emailQueue.push({options: options, callback: callback});
			execQueue();
		}else if(callback){
			callback();
		}
	}
}