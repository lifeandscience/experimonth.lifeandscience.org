var credentials = {
		clientID: process.env.TEST_CLIENT_ID || '514343e91b3e5f2287000001'
	  , clientSecret: process.env.TEST_CLIENT_SECRET || '232212a0e6781b1852c3d43e42246a95'
	  , site: process.env.BASEURL || 'http://localhost:8000'
	  , authorizationPath: '/oauth/authorize'
	  , tokenPath: '/oauth/access_token'
	}
  , OAuth2 = require('simple-oauth2')(credentials);

describe('API.Users',function(){
	var access_token = null;
	before(function(done){
		// TODO: Do setup stuff for testing (setup experimonths, add users, enroll them, etc.)

		OAuth2.ClientCredentials.getToken({}, function(err, result){
			result.should.have.property('access_token');
			access_token = result.access_token;
			done();
		});
	});
	describe('users', function(){
		it('gets a set of all users for a given experimonth', function(done){
			OAuth2.ClientCredentials.request('GET', '/experimonths/users/513e2232aec05a5b4d000001', {access_token: access_token}, function(err, res, body){
/*
				try {
					body = JSON.parse(body);
				}catch(e){}
*/

				console.log('users: ', body);
				console.log('err: ', err);
				// TODO: Do something to verify this!
			});
		});
	});
});