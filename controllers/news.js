var form = require('express-form')
  , field = form.field
  , utilities = require('../utilities')
  , mongoose = require('mongoose')
  , NewsPost = mongoose.model('NewsPost')
  , moment = require('moment')
  , email = require('../email')
  , util = require('util')
  , auth = require('../auth')
  , s3 = require('../s3');

module.exports = function(app){
	app.get('/news', function(req, res){
		var query = NewsPost.find({});
		if(!req.user || req.user.role < 10){
			query.where('active', true);
		}else{
			query.populate('recentEvents');
		}
		query.sort('-date').exec(function(err, newsPosts){
			for(var i=0; i<newsPosts.length; i++){
				newsPosts[i].text = newsPosts[i].text.replace(/\r\n/gmi, '<br/>').replace(/\r/gmi, '<br/>').replace(/\n/gmi, '<br/>');
			}
			res.render('news', {title: 'All News', newsPosts: newsPosts, moment: moment});
		});
	});
	
	app.get('/news/publish/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			req.flash('error', 'News Post ID required!');
			res.redirect('/news');
			return;
		}
		NewsPost.findById(req.params.id).exec(function(err, newsPost){
			if(err || !newsPost){
				req.flash('error', 'News Post not found!');
				res.redirect('/news');
				return;
			}
			newsPost.active = true;
			newsPost.save(function(err){
				req.flash('info', 'News Post published!');
				res.redirect('/news');
				return;
			});
			return;
		});
	});
	
	app.get('/news/unpublish/:id', auth.authorize(2, 10), function(req, res){
		if(!req.params.id){
			req.flash('error', 'News Post ID required!');
			res.redirect('/news');
			return;
		}
		NewsPost.findById(req.params.id).exec(function(err, newsPost){
			if(err || !newsPost){
				req.flash('error', 'News Post not found!');
				res.redirect('/news');
				return;
			}
			newsPost.active = false;
			newsPost.save(function(err){
				req.flash('info', 'News Post unpublished!');
				res.redirect('/news');
				return;
			});
			return;
		});
	});
	
	// (as, populate, title, object, template, varNames, redirect, beforeRender, beforeSave)
	var as = 'newsPost'
	  , populate = []
	  , template = 'news/form'
	  , varNames = ['title', 'text', 'image', 'link']
	  , redirect = '/news'
	  , formValidate = form(
			field('text').trim().required(),
			field('title').trim().required(),
//			field('image').trim(),
			field('link').trim().required()
		)
	  , beforeRender = function(req, res, item, callback){
/*
			if(item.newsPost && req.params && req.params.number){
				item.newsPost.text = 'This is in reply to confession #'+req.params.number+': ';
			}
			item.action = '/confessional';
*/
			return callback(item);
	/* 		return item; */
		}
	  , beforeSave = function(req, res, item, complete){
			item.date = Date.now();
			console.log('req.files: ', req.files);
			if(req.files && req.files.image && req.files.image.size){
				s3.uploadFile(req.files.image, null, function(err, url){
					if(err){
						console.log('error uploading file: ', err);
					}else if(url){
						item.image = url;
					}
					return complete(item);
				});
			}else{
				return complete(item);
			}
		}
	  , layout = 'layout';
	
	app.get('/news/add', utilities.doForm(as, populate, 'Add News Post', NewsPost, template, varNames, redirect, beforeRender, null, layout));
	app.post('/news/add', formValidate, utilities.doForm(as, populate, 'Add News Post', NewsPost, template, varNames, redirect, beforeRender, beforeSave, layout));

	app.get('/news/edit/:id', utilities.doForm(as, populate, 'Edit News Post', NewsPost, template, varNames, redirect, beforeRender, null, layout));
	app.post('/news/edit/:id', formValidate, utilities.doForm(as, populate, 'Edit News Post', NewsPost, template, varNames, redirect, beforeRender, beforeSave, layout));
}