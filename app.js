
/**
 * Module dependencies.
 */

var express = require('express')
  , auth = require('./auth')
  , http = require('http')
  , path = require('path')
  , fs = require('fs')
  , mongoose = require('mongoose') 
  , MongoStore = require('connect-mongo')(express)
  , flash = require('connect-flash')
  , moment = require('moment');
  
  
// Database
var dbURL = process.env.MONGO_URL || 'mongodb://localhost/experimonth'
  , db = mongoose.connect(dbURL);

// Models
var dir = __dirname + '/models';
// grab a list of our route files
fs.readdirSync(dir).forEach(function(file){
	require('./models/'+file);
});

var app = express();

app.configure(function(){
	app.set('port', process.env.PORT || 8000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser('your secret here'));
	app.use(express.session({
		secret: "experimonthSecretForSession"
		, store: new MongoStore({
			url: dbURL
		})
	}));
	app.use(flash());
	
	
	
	

	var Notification = mongoose.model('Notification');
	app.use(function(req, res, next){
		// Dynamic locals
/* 		res.locals._ = _; */
		res.locals.flash = req.flash.bind(req);
		res.locals.moment = moment;
		res.locals.user = function(minimumState, minimumRole){
			if(minimumState == undefined){
				minimumState = 0
			}
			if(minimumRole == undefined){
				minimumRole = 0;
			}
			if(req.user && req.user.state >= minimumState && req.user.role >= minimumRole){
				return req.user;
			}
			return null;
		}
		res.locals.is_active_nav = function(nav, url){
			if(nav && nav.length){
				for(var i=0, ii = nav.length; i < ii; i++){
					var n = nav[i];
					console.log('comparing ', n.link, url)
					if(n.link == url){
						console.log('woo!')
						return true;
					}
					if(n.children && is_active(n.children)){
						return true;
					}
				}
			}
			console.log('not active...')
			return false;
		};
		if(!req.user){
			return next();
		}
		Notification.find({user: req.user, read: false}, function(err, notifications){
			res.locals.notifications = notifications;
			next();
		});
//		next();
	});
	auth.setup(app);
	
	
	
	
	
	app.use(app.router);
	app.use(require('less-middleware')({ src: __dirname + '/public' }));
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

auth.route(app);
var controllers = require('./controllers');
for(var controllerName in controllers){
	(controllers[controllerName])(app);
}

/* app.get('/', routes.index); */

http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});
