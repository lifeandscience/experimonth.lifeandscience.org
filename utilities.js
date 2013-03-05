var sockets = [];

module.exports = {
	doForm: function(as, populate, title, object, template, varNames, redirect, beforeRender, beforeSave, layout){
		return function(req, res){
	
			var validated = false;
			if(req.method == 'POST'){
				validated = req.form.isValid;
				if(!validated){
					console.log('errors: ', req.form.errors);
				}
			}
			
			var item = null
			  , done =function(err, doc){
					console.log('err: ', err);
					console.log('doc: ', doc);
					if(doc){
						if(doc[0]){
							item = doc[0];
						}else{
							item = doc;
						}
					}
					var finish = function(obj){
						console.log('obj: ', obj);
						if(obj){
							res.render(template, obj);
						}
					};
	
					if(validated){
						if(!item){
							item = new object();
						}
						console.log(varNames);
						console.log(req.form);
						varNames.forEach(function(name){
							if(req.form[name]){
								item[name] = req.form[name];
							}
						});
						var complete = function(item){
							item.save(function(err, result){
								if(err){
									var obj = {title: title};
									obj[as] = item;
									if(beforeRender){
										beforeRender(req, res, obj, finish);
									}else{
										finish(obj);
									}
	/*
									if(layout){
										util.log('layout: '+layout);
										obj.layout = layout;
									}
	*/
									return;
								}
								res.redirect(redirect);
								return;
							});
						};
						if(beforeSave){
							beforeSave(req, res, item, complete);
						}else{
							complete(item);
						}
						return;
					}
		
					if(!item){
						item = {};
					}
					var obj = {title: title};
					obj[as] = item;
					if(beforeRender){
						beforeRender(req, res, obj, finish);
					}else{
						finish(obj);
					}
	/*
					if(layout){
						util.log('layout: '+layout);
						obj.layout = layout;
					}
	*/
					return;
				};
			if(req.params && req.params.id){
				console.log('woo?', req.params.id);
				var query = object.findById(req.params.id);
				if(populate){
					query.populate(populate);
				}
				query.exec(done);
			}else{
				done(null, null);
			}
		}
	}
	
  , getByID: function(object, title, populate){
		if(!populate){
			populate = [];
		}
		return function(req, res, next){
			if(req.params && req.params.id){
				var query = object.findById(req.params.id);
				for(var i=0; i<populate.length; i++){
					query.populate(populate[i]);
				}
				query.exec(function(err, item){
					if(!err){
						req[title] = item;
					}else{
						req.flash('error', title+' not found.');
					}
					next();
				});
				return;
			}
			req.flash('error', 'No '+title+' ID provided');
			next();
		}
	}

  , checkAdmin: function(req, res, next){
		if(req.loggedIn && req.user && req.user.role == 10){
			// Check if they're an admin!
			next();
			return;
		}
		req.flash('error', 'You are not authorized to view that resource!');
		res.redirect('/');
	}
  , addSocket: function(socket){
		sockets.push(socket);
	}
  , removeSocket: function(socket){
		var idx = sockets.indexOf(socket);
		if(idx != -1){
			sockets.splice(idx, 1);
		}
	}
  , getSockets: function(){
		return sockets;
	}
}