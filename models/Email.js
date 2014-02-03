var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , util = require('util');

var EmailSchema = new Schema({
	date: {type: Date, default: function(){ return new Date(); }}
  , ops: {type: Schema.Types.Mixed}
  , sent: {type: Boolean, default: false}
  , mandrillMessageId: String
  , mandrillMessageStatus: String
  , mandrillMessageReason: String
  , user: {type: Schema.ObjectId, ref: 'User'}
});

var Email = mongoose.model('Email', EmailSchema);
exports = Email;