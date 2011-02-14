var assert = require('nodetk/testing/custom_assert')
  , server = require('../../lib/server')
  , tools = require('nodetk/testing/tools')
  , querystring = require('querystring')
  , expect_oauth_error = require('./tools').expect_oauth_error
  ;

// Reinit some mocked / faked stuff:
original_authorize = server.authorize;
original_oauth_error = server.oauth_error;
exports.module_close = function(callback) {
  server.authorize = original_authorize;
  server.oauth_error = original_oauth_error;
  callback();
};


exports.tests = [

['Params given (GET)', 3, function() {
  var qs = querystring.stringify({someparam: "someval"});
  var req = {url: 'http://server/auth?' + qs};
  var res = 'res obj';
  server.authorize = function(params, req_, res_) {
    assert.equal(req_, req);
    assert.equal(res_, res);
    assert.deepEqual({someparam: "someval"}, params);
  };
  server.authorize_endpoint(req, res);
}],

['Params given (POST)', 4, function() {
  var req = {url: 'http://server/auth'};
  req.form = {complete: function(callback) {
    assert.ok(true, 'must be called');
    callback(null, {someparam: "someval"});
  }};
  var res = 'res obj';
  server.authorize = function(params, req_, res_) {
    assert.equal(req_, req);
    assert.equal(res_, res);
    assert.deepEqual({someparam: "someval"}, params);
  };
  server.authorize_endpoint(req, res);
}],

['No params given', 3, function() {
  var req = {url: 'http://server/auth'};
  var res = 'res obj';
  expect_oauth_error(res, 'eua', 'invalid_request');
  server.authorize_endpoint(req, res);
}],

['Error in form.complete', 4, function() {
  var req = {url: 'http://server/auth'};
  req.form = {complete: function(callback) {
    assert.ok(true, 'must be called');
    callback('error');
  }};
  var res = 'res obj';
  expect_oauth_error(res, 'eua', 'invalid_request');
  server.authorize_endpoint(req, res);
}],

];

