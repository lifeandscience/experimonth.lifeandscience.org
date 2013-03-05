var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , util = require('util');

var CodebaseSchema = new Schema({
	name: String
});
var Codebase = mongoose.model('Codebase', CodebaseSchema);
var ExperimonthSchema = new Schema({
	startDate: {type: Date, default: function(){ return Date.now(); }}
  , endDate: {type: Date, default: function(){ return Date.now(); }}
  , name: {type: String}
  , description: {type: String}
  , type: [{type: String}]
  , image: {type: String}
  , codebase: {type: Schema.ObjectId, ref: 'Codebase'}
  , survey: {type: String} // Maybe another object?
  , userLimit: {type: Number, default: 100}
  , users: [{type: Schema.ObjectId, ref: 'User'}]
  , open: {type: Boolean, default: false}
  , conditions: [{type: Schema.ObjectId, ref: 'ProfileQuestion'}]
});

var Experimonth = mongoose.model('Experimonth', ExperimonthSchema);
exports = Experimonth;