var mongoose = require('mongoose')
  , Experimonth = mongoose.model('Experimonth')
  , Confession = mongoose.model('Confession')
  , NewsPost = mongoose.model('NewsPost')
  , async = require('async');

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
		app.get('/home', function(req, res){
			async.parallel({
				experimonths: function(callback){
					Experimonth.getEnrollableExperimonths().sort('startDate').limit(4).exec(callback);
				}
			  , confessions: function(callback){
					Confession.find({active: true, promoted: true}).sort('-date').limit(4).exec(callback);
				}
			  , news: function(callback){
					NewsPost.find({active: true}).sort('-date').limit(3).exec(callback);
				}
			}, function(err, results){
				res.render('index', { title: 'Home Page', currentlyRecruiting: results.experimonths, confessions: results.confessions, news: results.news });
			});
		});
		app.get('/get-notified', function(req, res){
			res.render('get-notified', { title: 'Get Notified' });
		});
		app.get('/what-is-this', function(req, res){
			res.render('what-is-this', { title: 'What Is This?' });
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