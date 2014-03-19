var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , util = require('util');

var ProfileQuestionSchema = new Schema({
	text: String
  , type: {type: String, enum: ['open', 'likert-style', 'multiple-choice'], default: 'open'}
  , choices: [String]
  , published: {type: Boolean, default: false}
  , publishDate: {type: Date, default: function(){ return Date.now(); }}
  , slug: String

	// Deprecated; requirement is determined by it's usage on an EM
  , required: {type: Boolean, default: false}
});
ProfileQuestionSchema.virtual('choices_string').get(function(){
	return this.choices.join(',');
});
ProfileQuestionSchema.virtual('transientRequired').get(function() {
  return this._transientRequired;
});
ProfileQuestionSchema.virtual('transientRequired').set(function(transientRequired) {
  return this._transientRequired = transientRequired;
});
var ProfileQuestion = mongoose.model('ProfileQuestion', ProfileQuestionSchema);

var ProfileAnswerSchema = new Schema({
	question: {type: Schema.ObjectId, ref: 'ProfileQuestion'}
  , user: {type: Schema.ObjectId, ref: 'User'}
  , value: String
  , no_answer: {type: Boolean, default: false}
});
var ProfileAnswer = mongoose.model('ProfileAnswer', ProfileAnswerSchema);

exports = {};