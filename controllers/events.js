var mongoose = require('mongoose')
  , Event = mongoose.model('Event');

module.exports = function(app){
	app.get('/events/user/:userid', function(req, res){
		var id = req.param('userid');
		if(!id){
			req.flash('error', 'User ID not found.');
			res.redirect('back');
			return;
		}
		Event.find({user: id}).exec(function(err, events){
			if(err || !events){
				req.flash('error', 'Error reading events.');
				res.redirect('back');
				return;
			}
			res.json(events);
		});
	});
	app.get('/events/experimonth/:emid', function(req, res){
		var id = req.param('emid');
		if(!id){
			req.flash('error', 'Experimonth ID not found.');
			res.redirect('back');
			return;
		}
		Event.find({experimonth: id}).exec(function(err, events){
			if(err || !events){
				req.flash('error', 'Error reading events.');
				res.redirect('back');
				return;
			}
			res.json(events);
		});
	});
	app.get('/events/:userid/:emid', function(req, res){
		var id = req.param('userid');
		if(!id){
			req.flash('error', 'User ID not found.');
			res.redirect('back');
			return;
		}
		var emid = req.param('emid');
		if(!emid){
			req.flash('error', 'Experimonth ID not found.');
			res.redirect('back');
			return;
		}
		Event.find({user: id, experimonth: emid}).exec(function(err, events){
			if(err || !events){
				req.flash('error', 'Error reading events.');
				res.redirect('back');
				return;
			}
			res.json(events);
		});
	});
	
	app.post('/events', function(req, res){
		// TODO: Should we validate whether the user and experimonth exist?
		var event = new Event();
		event.experimonth = req.body.experimonth;
		event.user = req.body.user;
		event.name = req.body.name;
		event.value = req.body.value;
		event.save(function(err, event){
			res.json(event);
		});
	});
};