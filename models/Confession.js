var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , util = require('util');

var ConfessionSchema = new Schema({
	date: {type: Date, default: function(){ return Date.now(); }}
  , number: {type: Number, default: -1}
  , active: {type: Boolean, default: true}
  , flags: {type: Number, default: 0}
  , text: String
  , recentEvents: [{type: Schema.ObjectId, ref: 'Event'}]
});

var Confession = mongoose.model('Confession', ConfessionSchema);
exports = Confession;