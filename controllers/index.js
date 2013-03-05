
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
	}
};

/*
function(req, res){
  res.render('index', { title: 'Express' });
};
*/