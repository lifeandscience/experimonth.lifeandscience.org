var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , util = require('util');

var EventSchema = new Schema({
	date: {type: Date, default: function(){ return new Date(); }}
  , name: String
  , value: String
  , experimonth: {type: Schema.ObjectId, ref: 'Experimonth'}
  , kind: {type: Schema.ObjectId, ref: 'ExperimonthKind'}
  , user: {type: Schema.ObjectId, ref: 'User'}
});

var Event = mongoose.model('Event', EventSchema);
exports = Event;