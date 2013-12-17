var sockets = []
  , timezones = false;

module.exports = {
	doForm: function(as, populate, title, object, template, varNames, redirect, beforeRender, beforeSave, layout, afterSave){
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
					if(doc){
						if(doc[0]){
							item = doc[0];
						}else{
							item = doc;
						}
					}
					var finish = function(obj){
						if(obj){
							res.render(template, obj);
						}
					};
	
					if(validated){
						if(!item){
							item = new object();
						}
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
								if(afterSave){
									afterSave(result, req, res);
								}else{
									res.redirect(redirect);
								}
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
  , getTimezones: function(){
		if(timezones){
			return timezones;
		}
		var tz = require('timezone/zones');
		timezones = {};
		for(var i=0; i<tz.length; i++){
			var zone = tz[i];
			if(zone.zones){
				for(zoneAcronym in zone.zones){
					timezones[zoneAcronym] = zone.zones[zoneAcronym][1].offset / (60*60*1000);
				}
			}
		}
/*
		for(var i=-12; i<13; i++){
			timezones[''+i] = i;
		}
*/
		
		// Pick a random timezone
/*
		var zone = timezones[Math.floor(Math.random()*timezones.length)];
		console.log('zone: ', zone);
		
		zone = require('timezone/'+zone).zones[zone];
		console.log('loaded: ', zone[1].abbrev, zone[1].offset);
*/
		return timezones;
	}
/*
  , getTimezoneFromOffset: function(offset){
		var ok = require("assert")
		  , eq = require("assert").equal
		  , tz = require('timezone');
		offset = ''+offset;
		if(offset.length == 2){
			if(offset[0] == '-'){
				offset = offset[0]+'0'+offset[1];
			}else{
				offset = '+'+offset;
			}
		}
		if(offset.length == 1){
			offset = '+0'+offset;
		}
		var dString = "2000-01-01 12:00:00"+offset;
		var y2k = tz(dString);
		//y2k = tz("2000-01-01");
		console.log('y2k:', dString, y2k, tz(y2k, '%T %F%^z'));
//		eq( tz("1999-12-31 20:00-04:00"), y2k );
//		var d = tz("2000-01-01 00:00:00"+offset+":00");
//		console.log(offset, "2000-01-01 00:00:00"+offset+":00", d, tz, d("%T %F%^z"), tz(d, "%T %F%^z"));
	}
*/
}