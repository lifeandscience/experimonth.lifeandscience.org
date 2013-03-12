var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , util = require('util');

var ExperimonthKindSchema = new Schema({
	name: String
  , url: {type: String}
  , instructions: {type: String}
});
var ExperimonthKind = mongoose.model('ExperimonthKind', ExperimonthKindSchema);

var ExperimonthSchema = new Schema({
	startDate: {type: Date, default: function(){ return Date.now(); }}
  , endDate: {type: Date, default: function(){ return Date.now(); }}
  , name: {type: String}
  , description: {type: String}
  , type: [{type: String}]
  , image: {type: String}
  , kind: {type: Schema.ObjectId, ref: 'ExperimonthKind'}
  , survey: {type: String} // Maybe another object?
  , userLimit: {type: Number, default: 100}
  , unlimited: {type: Boolean, default: false}
  , users: [{type: Schema.ObjectId, ref: 'User'}]
  , enrollments: [{type: Schema.ObjectId, ref: 'ExperimonthEnrollment'}]
  , open: {type: Boolean, default: false}
  , conditions: [{type: Schema.ObjectId, ref: 'ProfileQuestion'}]
  , published: {type: Boolean, default: false}
  , publishDate: {type: Date, default: function(){ return Date.now(); }}
});

var Experimonth = mongoose.model('Experimonth', ExperimonthSchema);
exports = Experimonth;

var ExperimonthEnrollmentSchema = new Schema({
	experimonth: {type: Schema.ObjectId, ref: 'Experimonth'}
  , user: {type: Schema.ObjectId, ref: 'User'}
  , survey: {type: String}
});
var ExperimonthEnrollment = mongoose.model('ExperimonthEnrollment', ExperimonthEnrollmentSchema);