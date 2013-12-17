var mongoose = require('mongoose')
  , Notification = mongoose.model('Notification');

module.exports = function(app){
	app.get('/notification/read/:id', function(req, res){
		var id = req.param('id');
		if(!id){
			req.flash('error', 'Notification ID not found.');
			res.redirect('back');
			return;
		}
		Notification.findById(id, function(err, notification){
			if(err || !notification){
				req.flash('error', 'Error reading notification.');
				res.redirect('back');
				return;
			}
			
			notification.read = true;
			notification.save(function(err){
				if(err){
					req.flash('error', 'Error saving notification.');
					res.redirect('back');
					return;
				}
				
				res.redirect('back');
				return;
			});
		});
		
	});
};