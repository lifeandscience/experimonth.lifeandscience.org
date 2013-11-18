var console = require('console')
  , uuid = require('node-uuid')
  , fs = require('fs')
  , path = require('path')

  , accessKey = process.env.S3_ACCESS_KEY
  , accessSecret = process.env.S3_ACCESS_SECRET
  , bucket = process.env.S3_BUCKET
  , root = '';
if(process.env.S3_SLUG){
	root += process.env.S3_SLUG + '/';
}
  
var AWS = require('aws-sdk');
AWS.config.update({
	accessKeyId: accessKey
  , secretAccessKey: accessSecret
});
var s3 = new AWS.S3();

// TODO: Configure this bucket with ENV variables if set
//s3.setBucket(bucket);

module.exports = {
	client: s3
  , bucket: bucket
  , path: root
  , uploadFile: function(file, folder, complete){
		// Uploads the given file to S3 with a unique filename
		// Calls complete with the resulting URL
		fs.readFile(file.path, function(err, data){
			if(err){
				complete(err);
				return;
			}
			var key = root;
			if(folder){
				key += folder + '/';
			}
			key += uuid.v4();
			key += path.extname(file.path);
			s3.putObject({
				Bucket: bucket
			  , Key: key
			  , Body: data
			  , ACL: 'public-read'
			}, function(err, resp){
				complete(err, 'http://s3.amazonaws.com/'+bucket+'/'+key);
				return;
			});
		});
	}
}
