
/*
 * GET home page.
 */

module.exports = {
	user: require('./user')
  , profile: require('./profile')
  , experimonths: require('./experimonths')
  , notifications: require('./notifications')
  , home: function(app){
		app.get('/home', function(req, res){
			res.render('index', { title: 'Home Page' });
		});
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
	}
  , api: require('./api')
};

/*
function(req, res){
  res.render('index', { title: 'Express' });
};
*/