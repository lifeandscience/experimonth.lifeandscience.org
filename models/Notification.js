var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , util = require('util');

var NotificationSchema = new Schema({
	date: {type: Date, default: function(){ return new Date(); }}
  , type: {type: String, enum: ['warning', 'error', 'success', 'info'], default: 'warning'}
  , read: {type: Boolean, default: false}
  , text: String
  , user: {type: Schema.ObjectId, ref: 'User'}
});

var Notification = mongoose.model('Notification', NotificationSchema);
exports = Notification;