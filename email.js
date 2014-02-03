var mongoose = require('mongoose')
  , _ = require('underscore')
  , mandrill = require('mandrill-api/mandrill')
  , mandrillClient = new mandrill.Mandrill(process.env.MANDRILL_API_KEY || 'eoz_qjt2dDQYBogWbOwk2w');

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
			Email.find().where('sent').ne(true).sort('date').limit(1).exec(function(err, emails){
				if(!err && emails && emails.length > 0){
					// Send this email!
					var theEmail = emails[0];
					if('true' == process.env.DO_NOTIFICATIONS){
						mandrillClient.messages.send({message: theEmail.ops}, function(result){
							if(result && result.length){
								theEmail.mandrillMessageId = result[0]._id;
								theEmail.mandrillMessageStatus = result[0].status;
								theEmail.mandrillMessageReason = result[0].reject_reason;
							}
							theEmail.sent = true;
							theEmail.save(function(err){
								// run the queue again!
								currentlySending = false;
								execQueue();
							});
						}, function(error){
							if(error){
								theEmail.mandrillMessageStatus = error.name
								theEmail.mandrillMessageReason = error.message
							}
							theEmail.sent = true;
							theEmail.save(function(err){
								// run the queue again!
								currentlySending = false;
								execQueue();
							});
						});
					}else{
						console.log('skipping due to DO_NOTIFICATIONS being disabled: ', theEmail.ops.to);
						theEmail.sent = true;
						theEmail.save(function(err){
							if(err){
								console.log('error saving email!', err);
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
	sendMail: function(options, userID){
		if(!options){
			options = {};
		}

		options.from_name = 'Experimonth';
		options.from_email = 'experimonth@lifeandscience.org';
		options.auto_text = true;
		options.track_opens = true;
		options.track_clicks = true;
		options.google_analytics_domains = [
			'science.experimonth.com'
		  , 'frenemy.experimonth.com'
		];

		// Add a standard footer to each email.
		options.html += '\n\n--\n\n<a href="'+process.env.BASEURL+'">Experimonth</a> | <a href="http://twitter.com/experimonth">Twitter</a> | <a href="http://facebook.com/experimonth">Facebook</a>';
		options.html = options.html.replace(/\n/g, '<br/>');

		var Email = mongoose.model('Email')
		  , email = new Email();
		email.user = userID;
		email.ops = options;
		email.markModified('ops');
		email.save(function(err){
			execQueue();
		});
	}
}