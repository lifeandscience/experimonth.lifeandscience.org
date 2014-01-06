// TODO: Later we'll remove this, but at startup, do the expensive work of checking whether a user hasAnsweredAllRequiredQuestions
var mongoose = require('mongoose')
  , async = require('async')
  , Migration = mongoose.model('Migration')
  , ProfileQuestion = mongoose.model('ProfileQuestion')
  , ProfileAnswer = mongoose.model('ProfileAnswer')
  , migrationName = '20140106-1-user-transferProfileQuestions.js';
Migration.doIfNotExists(migrationName, function(){
	async.parallel({
		zipcode: function(callback){
			ProfileQuestion.findOne({text: 'What is your Zip Code?'}).exec(function(err, question){
				if(err){
					console.log('error finding zip code question!', err);
					return callback(err);
				}else if(!question){
					question = new ProfileQuestion();
					question.text = 'What is your Zip Code?';
					question.published = true;
					question.save(function(err){
						callback(err, question);
					});
				}else{
					callback(null, question);
				}
			});
		}
	  , birthday: function(callback){
			ProfileQuestion.findOne({text: 'What is your Birthday?'}).exec(function(err, question){
				if(err){
					console.log('error finding birthday question!', err);
					return callback(err);
				}else if(!question){
					question = new ProfileQuestion();
					question.text = 'What is your Birthday?';
					question.published = true;
					question.save(function(err){
						callback(err, question);
					});
				}else{
					callback(null, question);
				}
			});
		}
	  , ethnicity: function(callback){
			ProfileQuestion.findOne({text: 'What is your Ethnicity?'}).exec(function(err, question){
				if(err){
					console.log('error finding ethnicity question!', err);
					return callback(err);
				}else if(!question){
					question = new ProfileQuestion();
					question.text = 'What is your Ethnicity?';
					question.published = true;
					question.save(function(err){
						callback(err, question);
					});
				}else{
					callback(null, question);
				}
			});
		}
	  , gender: function(callback){
			ProfileQuestion.findOne({text: 'What is your Gender?'}).exec(function(err, question){
				if(err){
					console.log('error finding gender question!', err);
					return callback(err);
				}else if(!question){
					question = new ProfileQuestion();
					question.text = 'What is your Gender?';
					question.published = true;
					question.save(function(err){
						callback(err, question);
					});
				}else{
					callback(null, question);
				}
			});
		}
	}, function(err, results){
		var User = mongoose.model('User');
		User.find().exec(function(err, users){
			if(!err || (users && users.length == 0)){
				var updateUserAnswer = function(user, question, value, label, callback){
					ProfileAnswer.findOne({user: user, question: question}).exec(function(err, answer){
						if(err || !answer){
							// Create a new one!
							answer = new ProfileAnswer();
							answer.user = user._id;
							answer.question = question._id;
						}else{
							// This is weird and should never happen, unless we re-ran this migration?
						}
						answer.value = value;
						answer.save(function(err){
							if(err){
								console.log('Error saving '+label+' answer for user: ', user.email, err);
							}else{
								user.answers.push(answer);
							}
							callback();
						})
					});
				}
				// For each user:
				async.each(users, function(user, callback){
					user.answers = user.answers.concat(user.requiredAnswers);
					user.answers = user.answers.concat(user.optionalAnswers);
					// See if they have an answer to each of these questions
					async.parallel({
						zipcode: function(callback){
							if(user.zipcode){
								updateUserAnswer(user, results.zipcode, user.zipcode, 'zipcode', callback);
							}
						}
					  , birthday: function(callback){
							if(user.birthday){
								updateUserAnswer(user, results.birthday, user.birthday, 'birthday', callback);
							}
						}
					  , ethnicity: function(callback){
							if(user.ethnicity){
								updateUserAnswer(user, results.ethnicity, user.ethnicity, 'ethnicity', callback);
							}
						}
					  , gender: function(callback){
							if(user.gender){
								updateUserAnswer(user, results.gender, user.gender, 'gender', callback);
							}
						}
					}, function(err){
						user.save(function(err){
							console.log('did finish updating a user\'s answers');
							callback();
						});
					});
				}, function(err){
/*
					Migration.createMigration(migrationName, 'done', function(saveErr){
						if(saveErr){
							console.log('Error saving migration: ', saveErr);
						}
*/
						console.log('did finish migrating basic user info to profile questions.');
/* 					}); */
				});
			}
		});
	});
});