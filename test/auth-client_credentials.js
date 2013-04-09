var credentials = {
		clientID: process.env.TEST_CLIENT_ID || '514343e91b3e5f2287000001'
	  , clientSecret: process.env.TEST_CLIENT_SECRET || '232212a0e6781b1852c3d43e42246a95'
	  , site: process.env.BASEURL || 'http://localhost:8000'
	  , authorizationPath: '/oauth/authorize'
	  , tokenPath: '/oauth/access_token'
	}
  , OAuth2 = require('simple-oauth2')(credentials);

describe('Auth.Client-Credentials',function() {
	describe('without having logged in', function(){
		it('attempts client credentials', function(done){
			OAuth2.ClientCredentials.request('GET', '/client-is-logged-in', null, function(err, body){
				err.should.have.property('message');
				var message = err.message;
				message.should.have.property('status', 401);
				message.should.have.property('message', 'Unauthorized');
				done();
			});
		});
	});
	describe('with login', function(){
		it('does login step and is logged in', function(done){
			OAuth2.ClientCredentials.getToken({}, function(err, result){
				result.should.have.property('access_token');

				OAuth2.ClientCredentials.request('GET', '/client-is-logged-in', {access_token: result.access_token}, function(err, body){
					body.should.have.property('error', null);
					body.should.have.property('message', 'You\'ve authenticated successfully!');
					done();
				});
			});
		});
	});
});
