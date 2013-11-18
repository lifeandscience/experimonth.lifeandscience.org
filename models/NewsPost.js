var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , util = require('util');

var NewsPostSchema = new Schema({
	date: {type: Date, default: function(){ return Date.now(); }}
  , active: {type: Boolean, default: false}
  , title: String
  , text: String
  , image: String
  , link: String
});

/*
NewsPostSchema.pre('save', function(next){
	this.date = Date.now();
	next();
});
*/

var NewsPost = mongoose.model('NewsPost', NewsPostSchema);
exports = NewsPost;