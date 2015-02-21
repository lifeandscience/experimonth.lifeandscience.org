process.env.TZ = 'America/New_York';

// Check expected ENV vars
[	'S3_ACCESS_KEY'
  , 'S3_ACCESS_SECRET'
  , 'S3_BUCKET'
  , 'S3_SLUG'
  , 'BASEURL'
].forEach(function(envVar, index){
	if(!process.env[envVar]){
		console.log(envVar+' environment variable is not set!');
		process.exit();
	}
});

// Check optional ENV vars
[	'PORT'
].forEach(function(envVar, index){
	if(!process.env[envVar]){
		console.log('OPTIONAL: '+envVar+' environment variable is not set!');
	}
});

/**
 * Module dependencies.
 */

var newrelic = require('newrelic')
  , express = require('express')
  , cons = require('consolidate')
  , auth = require('./auth')
  , http = require('http')
  , path = require('path')
  , fs = require('fs')
  , db = require('./db')
  , mongoose = require('mongoose') 
  , MongoStore = require('connect-mongo')(express)
  , flash = require('connect-flash')
  , moment = require('moment')
  , send = require('send')
  , url = require('url')
  , mongooseCachebox = require('mongoose-cachebox');

var options = {
  cache: true, // start caching
  ttl: 30 // 30 seconds
};

// adding mongoose cachebox
mongooseCachebox(mongoose, options);

// Models
var dir = __dirname + '/models';
// grab a list of our route files
fs.readdirSync(dir).forEach(function(file){
	require('./models/'+file);
});

// Data Migrations
var dir = __dirname + '/migrations';
// grab a list of our route files
fs.readdirSync(dir).forEach(function(file){
	require('./migrations/'+file);
});

var app = express();

app.configure(function(){
	app.set('port', process.env.PORT || 8000);
	app.engine('jade', cons.jade);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser('your secret here'));
	app.use(express.session({
		secret: "experimonthSecretForSession"
		, store: new MongoStore({
			url: process.env.MONGOHQ_URL || 'mongodb://localhost/experimonth'
		  , auto_reconnect: true
		})
	}));
	app.use(flash());
	
	
	
	

	var Notification = mongoose.model('Notification');
	var baseUrl = url.parse(process.env.BASEURL);
	app.use(function(req, res, next){
		// Check BASEURL 
		if(req.host != baseUrl.hostname){
			// Request host doesn't match configured host. Redirect?
			return res.redirect(process.env.BASEURL);
		}
		// Dynamic locals
/* 		res.locals._ = _; */
		res.locals.host = req.host;
		res.locals.flash = req.flash.bind(req);
		res.locals.moment = moment;
		res.locals.bodyClass = function(){
			return req.host.indexOf('.dev') != -1 ? 'dev' : (req.host.indexOf('testing.') != -1 ? 'testing' : '');
		};
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
					if(n.link == url){
						return true;
					}
					if(n.children && is_active(n.children)){
						return true;
					}
				}
			}
			return false;
		};
		next();
	});
	auth.setup(app);

	// We must setup this middleware after auth is setup, as otherwise req.user will never be set.
	app.use(function(req, res, next){
		if(!req.user){
			return next();
		}
		Notification.find({user: req.user, read: false}).sort('-date').exec(function(err, notifications){
			res.locals.notifications = notifications;
			next();
		});
	});
	
	
	
	
	
	app.use(app.router);
	app.use(require('less-middleware')({ src: __dirname + '/public' }));
	app.all('/venera/fonts/*', function(req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "X-Requested-With");
		next();
	});
	app.use(express.static(path.join(__dirname, 'public')));
	app.get('/js/em-navbar.js', function(req, res){
		var toWrite = '';
		if(req.user){
			toWrite += 'var EM_USER = '+JSON.stringify(req.user)+';';
			var n = null;
			if(res.locals && res.locals.userNotifications){
				n = res.locals.userNotifications;
			}else if(res.locals.notifications){
				n = res.locals.notifications;
			}
			if(n && n.length > 0){
				toWrite += 'var EM_USER_NUM_NOTIF = '+n.length+';';
			}
		}else{
			toWrite += 'var EM_USER = null;';
		}
		var fullURL = req.protocol + "://" + req.get('host');
		toWrite += 'var EM_URL = "'+fullURL+'";';
		var defaultNav = [
			{
				'name': 'What is this?'
			  , 'link': fullURL+'/what-is-this'
			},
			{
				'name': 'History'
			  , 'link': fullURL+'/history'
			},
			{
				'name': 'Currently Recruiting'
			  , 'link': fullURL+'/currently-recruiting'
			},
			{
				'name': 'Get Notified'
			  , 'link': fullURL+'/get-notified'
			},
			{
				'name': 'Confess'
			  , 'link': fullURL+'/confess'
			}
		];
		if(!req.user){
			toWrite += 'var EM_NAV = '+JSON.stringify(defaultNav)+';';
			toWrite += 'var EM_RIGHT_NAV = '+JSON.stringify([
				{
					'name': 'Sign In'
				  , 'link': fullURL+'/signin'
				  , 'class': 'signin'
				},
				{
					'name': 'Create Account'
				  , 'link': fullURL+'/register'
				  , 'class': 'create-account'
				}
			])+';';
		}else{
			toWrite += 'var EM_DEFAULT_NAV = '+JSON.stringify(res.locals.nav || defaultNav)+';';
			var rightNav = [
				{
					'name': 'Profile'
				  , 'link': fullURL+'/profile'
				},
				{
					'name': 'Logout'
				  , 'link': fullURL+'/logout'
				}
			];
			
			if(req.session.impersonation_id){
				rightNav.push({
					'name': 'End Impersonation'
				  , 'link': fullURL+'/users/stop-impersonating'
				});
			}
			toWrite += 'var EM_RIGHT_NAV = '+JSON.stringify(rightNav)+';';
		}
		res.write(toWrite);
		var fileStream = fs.createReadStream('./public/js/em-navbar.js');
        fileStream.pipe(res);
	});
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
