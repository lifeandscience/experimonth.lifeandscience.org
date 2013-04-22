var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , util = require('util');

var ProfileQuestionSchema = new Schema({
	text: String
  , type: {type: String, enum: ['open', 'multiple-choice'], default: 'open'}
  , choices: [String]
  , published: {type: Boolean, default: false}
  , required: {type: Boolean, default: false}
  , publishDate: {type: Date, default: function(){ return Date.now(); }}
});
ProfileQuestionSchema.virtual('choices_string').get(function(){
	return this.choices.join(',');
});
var ProfileQuestion = mongoose.model('ProfileQuestion', ProfileQuestionSchema);

var ProfileAnswerSchema = new Schema({
	question: {type: Schema.ObjectId, ref: 'ProfileQuestion'}
  , user: {type: Schema.ObjectId, ref: 'Player'}
  , value: String
  , no_answer: {type: Boolean, default: false}
});
var ProfileAnswer = mongoose.model('ProfileAnswer', ProfileAnswerSchema);

exports = {};