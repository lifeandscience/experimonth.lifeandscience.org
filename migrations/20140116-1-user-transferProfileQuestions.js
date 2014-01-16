// TODO: Later we'll remove this, but at startup, do the expensive work of checking whether a user hasAnsweredAllRequiredQuestions
var mongoose = require('mongoose')
  , async = require('async')
  , Migration = mongoose.model('Migration')
  , ProfileQuestion = mongoose.model('ProfileQuestion')
  , ProfileAnswer = mongoose.model('ProfileAnswer')
  , migrationName = '20140116-1-user-transferProfileQuestions';
Migration.doIfNotExists(migrationName, function(){
	async.parallel({
		name: function(callback){
			ProfileQuestion.findOne({text: 'What is your Name?'}).exec(function(err, question){
				if(err){
					console.log('error finding name question!', err);
					return callback(err);
				}else if(!question){
					question = new ProfileQuestion();
					question.text = 'What is your Name?';
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
						name: function(callback){
							if(user.name){
								updateUserAnswer(user, results.name, user.name, 'name', callback);
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