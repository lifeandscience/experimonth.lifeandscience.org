var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , hashSecret = 'experimonth-ahoy-hoy'
	// TODO: Perhaps this salt should be stored alongside the hash?
  , hashSalt = 'asaltvalueshouldbesomerandomtext'; // Do not change this for now

var ExperimonthKindSchema = new Schema({
	name: String
  , hash: String
  , url: {type: String}
  , instructions: {type: String}
  , image: String
});
ExperimonthKindSchema.post('save', function(kind){
	if(!kind.hash){
		kind.hash = require('crypto').createHash('md5').update(hashSecret+'|'+kind._id).digest("hex"); // This is the password
		console.log('password for client ', kind._id, ' is ', kind.hash);
		kind.hash = require('crypto').createHash('md5').update(hashSalt+'|'+kind.hash).digest("hex"); // This is the salted version of the password
		kind.save();
	}
});
ExperimonthKindSchema.statics.checkClientSecret = function(id, clientSecret, callback){
	this.findById(id).exec(function(err, kind){
		if(err || !kind){
			return callback(err, null);
		}
		var testHash = require('crypto').createHash('md5').update(hashSalt+'|'+clientSecret).digest("hex");
		// Doesn't match, callback nothing.
		if(testHash != kind.hash){
			callback(null, null);
		}
		// Matches! Callback with kind (client)!
		callback(null, kind);
	});
}
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

ExperimonthSchema.statics.findActiveQuery = function(){
	var today = new Date();
	return this.find({startDate: {$lte: today}, endDate: {$gte: today}, published: true});
};
ExperimonthSchema.statics.getEnrollableExperimonths = function(){
	var today = new Date();
	return this.find({endDate: {$gte: today}, published: true, open: true});
};
var Experimonth = mongoose.model('Experimonth', ExperimonthSchema);
exports = Experimonth;

var ExperimonthEnrollmentSchema = new Schema({
	experimonth: {type: Schema.ObjectId, ref: 'Experimonth'}
  , user: {type: Schema.ObjectId, ref: 'User'}
  , survey: {type: String}
});
var ExperimonthEnrollment = mongoose.model('ExperimonthEnrollment', ExperimonthEnrollmentSchema);