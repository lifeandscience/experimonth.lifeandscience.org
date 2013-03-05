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
/* 		util.log('execQueue'); */
		// Grab the latest from the queue
		if(emailQueue.length > 0 && emailsInFlight < numEmailsPerSecond){
/* 			util.log('queue length is '+emailQueue.length); */
			var currentTime = Math.floor(Date.now()/1000);
/* 			util.log('current time: '+currentTime); */
/* 			util.log('vs last time: '+lastSendingTime); */
			if(currentTime == lastSendingTime){
				// Check the count and possibly sleep
/* 				util.log('this is running during the same second!'); */
				if(lastSendingTimeCount == numEmailsPerSecond){
					// We've met our rate
					// Sleep / postpone this iteration
/* 					util.log('we\'ve met our rate limit!'); */
/* 					util.log('setting a timeout until the next second!'); */
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
/* 			var foobar = function(error, response){ */
			    if(error){
			        util.log('Email message not sent: '+util.inspect(error));
			    }else{
			        util.log("Message sent: "+util.inspect(mail.options));
			        util.log("Got a response of " + util.inspect(response));
			    }
			    if(mail.callback){
			    	mail.callback();
			    }
			    emailsInFlight--;
			    execQueue();
/* 			}(null, 'Dummy Response!'); */
			});
		}
	};

module.exports = {
	sendMail: function(options, callback){
		emailQueue.push({options: options, callback: callback});
		execQueue();
	}
}