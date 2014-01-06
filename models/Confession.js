var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , util = require('util')
  , async = require('async');

var ConfessionSchema = new Schema({
	date: {type: Date, default: function(){ return Date.now(); }}
  , number: {type: Number, default: -1}
  , active: {type: Boolean, default: true}
  , promoted: {type: Boolean, default: false}
  , flags: {type: Number, default: 0}
  , text: String
  , recentEvents: [{type: Schema.ObjectId, ref: 'Event'}]
  , random: {type: [Number], default: function(){ return [Math.random(), Math.random()]}, index: '2d'}
  , _oldID: String
});

ConfessionSchema.statics.findRandom = function(user, callback){
	var query = Confession.find().where('random').near([Math.random(), Math.random()]).limit(1);
	if(!user || user.role < 10){
		query.where('active', true);
	}
	query.exec(function(err, confessions){
		if(confessions.length > 0){
			callback(confessions[0]);
		}else{
			callback(null);
		}
	});
};

var Confession = mongoose.model('Confession', ConfessionSchema);
Confession.find({random: null}).exec(function(err, confessions){
	if(confessions.length > 0){
		for(var i=0; i<confessions.length; i++){
			confessions[i].random = [Math.random(), Math.random()];
			confessions[i].save();
		}
	}
});

exports = Confession;