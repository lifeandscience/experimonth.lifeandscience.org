var mongoose = require('mongoose')
  , Experimonth = mongoose.model('Experimonth')
  , Confession = mongoose.model('Confession')
  , NewsPost = mongoose.model('NewsPost')
  , async = require('async')
  , email = require('../email');

/*
 * GET home page.
 */

module.exports = {
	user: require('./user')
  , profile: require('./profile')
  , experimonths: require('./experimonths')
  , confessions: require('./confessions')
  , news: require('./news')
  , notifications: require('./notifications')
  , home: function(app){
		app.get('/', function(req, res){
			async.parallel({
				experimonths: function(callback){
					Experimonth.findEnrollableExperimonths().limit(4).exec(callback);
				}
			  , confessions: function(callback){
					Confession.find({active: true, promoted: true}).sort('-date').limit(6).exec(callback);
				}
			  , news: function(callback){
					NewsPost.find({active: true}).sort('-date').limit(3).exec(callback);
				}
			}, function(err, results){
				res.render('index', { title: 'Experimonth | Know Yourself. Through Science.', currentlyRecruiting: results.experimonths, confessions: results.confessions, news: results.news });
			});
		});
		app.get('/get-notified', function(req, res){
			res.render('get-notified', { title: 'Get Notified' });
		});
		app.get('/what-is-this', function(req, res){
			res.render('what-is-this', { title: 'What Is This?' });
		});
		app.get('/feedback', function(req, res){
			res.render('feedback', { title: 'Feedback', email: null, text: null });
		});
		app.post('/feedback', function(req, res){
			var theEmail = req.param('email');
			var text = req.param('text');
			if(!theEmail || theEmail.length == 0){
				req.flash('error', 'Please provide your email address.');
				res.render('feedback', { title: 'Feedback', email: theEmail, text: text });
				return;
			}
			if(!text || text.length == 0){
				req.flash('error', 'Please provide your feedback.');
				res.render('feedback', { title: 'Feedback', email: theEmail, text: text });
				return;
			}
			var mailOptions = {
		    	from: "Experimonth: Frenemy <experimonth@lifeandscience.org>", // sender address
		    	to: 'experimonth+feedback@lifeandscience.org', // list of receivers
		    	subject: 'Experimonth Feedback Box Submission', // Subject line,
				generateTextFromHTML: true,
				html: 'New feedback posted on '+moment().format('YYYY-MM-DD hh:mm A')+'\n\n---\n\n'+req.param('email')+'\n\n---\n\n'+req.param('text')
		    };

		    // send mail with defined transport object
			email.sendMail(mailOptions, function(){
				req.flash('info', 'Thank you for your feedback!');
				res.redirect('/');
			});
		});
/*
		app.get('/empty', function(req, res){
			var mongoose = require('mongoose')
			  , count = 0
			  , done = function(){
					if(--count == 0){
						res.redirect('/home');
					}
				};
			for(collection in mongoose.connection.collections){
				count++;
			}
			for(collection in mongoose.connection.collections){
				mongoose.connection.collections[collection].drop(done);
			}
		});
*/
	}
  , api: require('./api')
};

/*
function(req, res){
  res.render('index', { title: 'Express' });
};
*/