var credentials = {
		clientID: process.env.TEST_CLIENT_ID || '514343e91b3e5f2287000001'
	  , clientSecret: process.env.TEST_CLIENT_SECRET || '232212a0e6781b1852c3d43e42246a95'
	  , site: process.env.BASEURL || 'http://localhost:8000'
	  , authorizationPath: '/oauth/authorize'
	  , tokenPath: '/oauth/access_token'
	}
  , OAuth2 = require('simple-oauth2')(credentials);

describe('API.Events',function() {
	it('gets a list of events for a particular user', function(done){
		// TODO: In order to accomplish this, we need to do setup/teardown stuff
		// Otherwise, we have no idea what user accounts, what experimonths, etc. are setup in the system.
		OAuth2.ClientCredentials.getToken({}, function(err, result){
			result.should.have.property('access_token');

			OAuth2.ClientCredentials.request('GET', '/api/1/events/user/<user-id>', {access_token: result.access_token}, function(err, res, body){
				res.should.have.property('statusCode', 200);
				try {
					body = JSON.parse(body);
				}catch(e){};
				done();
			});
		});
	});
	it('gets a list of events for a particular experimonth', function(done){
		// TODO: In order to accomplish this, we need to do setup/teardown stuff
		// Otherwise, we have no idea what user accounts, what experimonths, etc. are setup in the system.
		OAuth2.ClientCredentials.getToken({}, function(err, result){
			result.should.have.property('access_token');

			OAuth2.ClientCredentials.request('GET', '/api/1/events/experimonth/<experimonth-id>', {access_token: result.access_token}, function(err, res, body){
				res.should.have.property('statusCode', 200);
				try {
					body = JSON.parse(body);
				}catch(e){};
				done();
			});
		});
	});
	it('gets a list of events for a particular user and experimonth', function(done){
		// TODO: In order to accomplish this, we need to do setup/teardown stuff
		// Otherwise, we have no idea what user accounts, what experimonths, etc. are setup in the system.
		OAuth2.ClientCredentials.getToken({}, function(err, result){
			result.should.have.property('access_token');

			OAuth2.ClientCredentials.request('GET', '/api/1/events/<user-id>/<experimonth-id>', {access_token: result.access_token}, function(err, res, body){
				res.should.have.property('statusCode', 200);
				try {
					body = JSON.parse(body);
				}catch(e){};
				done();
			});
		});
	});
	it('posts a new event', function(done){
		// TODO: In order to accomplish this, we need to do setup/teardown stuff
		// Otherwise, we have no idea what user accounts, what experimonths, etc. are setup in the system.
		OAuth2.ClientCredentials.getToken({}, function(err, result){
			result.should.have.property('access_token');

			OAuth2.ClientCredentials.request('POST', '/api/1/events', {
				access_token: result.access_token
			  , user: '<user-id>'
			  , experimonth: '<experimonth-id>'
			  , name: 'test:Test Event'
			  , value: 'Test Event Value'
			}, function(err, res, body){
				res.should.have.property('statusCode', 200);
				try {
					body = JSON.parse(body);
				}catch(e){};
				done();
			});
		});
	});
});
