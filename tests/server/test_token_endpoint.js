var assert = require('nodetk/testing/custom_assert')
  , server = require('../../lib/server')
  , tools = require('nodetk/testing/tools')
  , extend = require('nodetk/utils').extend
  , expect_oauth_error = require('./tools').expect_oauth_error
  ;


// To reinit faked/mocked stuff in the end:
var initial_oauth_error = server.oauth_error;
var initial_RFactory = server.RFactory;
var initial_valid_grant = server.valid_grant;
exports.module_close = function(callback) {
  server.oauth_error = initial_oauth_error;
  server.RFactory = initial_RFactory;
  server.valid_grant = initial_valid_grant;
  callback();
};


exports.tests = [

['no req.form', 3, function() {
  var res = 'resobj';
  var req = {};
  expect_oauth_error(res, 'oat', 'invalid_request');
  server.token_endpoint(req, res);
}],

['req.form with err', 3, function() {
  var res = 'resobj';
  var req = {form: {complete: function(callback){callback('error')}}};
  expect_oauth_error(res, 'oat', 'invalid_request');
  server.token_endpoint(req, res);
}],

['Missing parameter', 12, function() {
  server.RFactory = function(){return {}};
  var res = 'resobj';
  var params = {grant_type: 1, client_id: 1, code: 1, redirect_uri: 1};
  Object.keys(params).forEach(function(missing) {
    var mparams = extend({}, params);
    delete mparams[missing];
    var req = {form: {complete: function(callback){callback(null, mparams)}}};
    expect_oauth_error(res, 'oat', 'invalid_request');
    server.token_endpoint(req, res);
  });
}],

['Unsupported grant_type', 12, function() {
  server.RFactory = function(){return {}};
  var res = 'resobj';
  var params = {client_id: 1, code: 1, redirect_uri: 1};
  [ "password"
  , "assertion"
  , "refresh_token"
  , "none"].forEach(function(grant_type) {
    var params2 = extend({grant_type: grant_type}, params);
    var req = {form: {complete: function(callback){callback(null, params2)}}};
    expect_oauth_error(res, 'oat', 'unsupported_grant_type');
    server.token_endpoint(req, res);
  });
}],

['client_secret given twice', 3, function() {
  server.RFactory = function(){return {}};
  var res = 'resobj';
  var params = {
    client_id: 1, code: 1, redirect_uri: 1,
    grant_type: 'authorization_code',
    client_secret: 'somesecret'
  };
  var req = {
    headers: {authorization: 'Basic somesecret'}
  , form: {complete: function(callback){callback(null, params)}}
  };
  expect_oauth_error(res, 'oat', 'invalid_request');
  server.token_endpoint(req, res);
}],


['Unexisting client', 4, function() {
  server.RFactory = function(){return {Client: {get: function(query, callback) {
    assert.equal(query.ids, 'cid');
    callback(null);
  }}}};
  var res = 'resobj';
  var params = {
    client_id: 'cid', code: 1, redirect_uri: 1,
    grant_type: 'authorization_code',
  };
  var req = {
    headers: {authorization: 'Basic somesecret'}
  , form: {complete: function(callback){callback(null, params)}}
  };
  expect_oauth_error(res, 'oat', 'invalid_client');
  server.token_endpoint(req, res);
}],

['Incorrect secret (in headers)', 4, function() {
  server.RFactory = function(){return {Client: {get: function(query, callback) {
    assert.equal(query.ids, 'cid');
    callback({secret: 'someothersecret'});
  }}}};
  var res = 'resobj';
  var params = {
    client_id: 'cid', code: 1, redirect_uri: 1,
    grant_type: 'authorization_code',
    //client_secret: 'somesecret'
  };
  var req = {
    headers: {authorization: 'Basic somesecret'}
  , form: {complete: function(callback){callback(null, params)}}
  };
  expect_oauth_error(res, 'oat', 'invalid_client');
  server.token_endpoint(req, res);
}],


['Incorrect secret (in params)', 4, function() {
  server.RFactory = function(){return {Client: {get: function(query, callback) {
    assert.equal(query.ids, 'cid');
    callback({secret: 'someothersecret'});
  }}}};
  var res = 'resobj';
  var params = {
    client_id: 'cid', code: 1, redirect_uri: 1,
    grant_type: 'authorization_code',
    client_secret: 'somesecret'
  };
  var req = {
    headers: {}
  , form: {complete: function(callback){callback(null, params)}}
  };
  expect_oauth_error(res, 'oat', 'invalid_client');
  server.token_endpoint(req, res);
}],

['Invalid grant', 3, function() {
  server.RFactory = function(){return {Client: {get: function(query, callback) {
    callback({secret: 'somesecret', redirect_uri: 'http://client/process'});
  }}}};
  server.valid_grant = function(_, _, callback){callback(null)};
  var res = 'resobj';
  var params = {
    client_id: 'cid', code: 1, redirect_uri: 'http://client/process',
    grant_type: 'authorization_code',
    client_secret: 'somesecret'
  };
  var req = {
    headers: {}
  , form: {complete: function(callback){callback(null, params)}}
  };
  expect_oauth_error(res, 'oat', 'invalid_grant');
  server.token_endpoint(req, res);
}],

['Error retrieving client', 3, function() {
  server.RFactory = function(){return {Client: {get: function(query, _, fallback) {
    fallback('error');
  }}}};
  var params = {
    client_id: 'cid', code: 1, redirect_uri: 'http://client/process',
    grant_type: 'authorization_code',
    client_secret: 'somesecret'
  };
  var req = {
    headers: {}
  , form: {complete: function(callback){callback(null, params)}}
  };
  var res = tools.get_expected_res(500);
  server.token_endpoint(req, res);
}],

['Error while validating grant', 3, function() {
  server.RFactory = function(){return {Client: {get: function(query, callback) {
    callback({secret: 'somesecret', redirect_uri: 'http://client/process'});
  }}}};
  server.valid_grant = function(_, _, _, fallback){fallback('error')};  
  var params = {
    client_id: 'cid', code: 1, redirect_uri: 'http://client/process',
    grant_type: 'authorization_code',
    client_secret: 'somesecret'
  };
  var req = {
    headers: {}
  , form: {complete: function(callback){callback(null, params)}}
  };
  var res = tools.get_expected_res(500);
  server.token_endpoint(req, res);
}],

['Valid grant', 3, function() {
  server.RFactory = function(){return {Client: {get: function(query, callback) {
    callback({secret: 'somesecret', redirect_uri: 'http://client/process'});
  }}}};
  server.valid_grant = function(_, _, callback){callback({'a': 'b'})};
  var params = {
    client_id: 'cid', code: 1, redirect_uri: 'http://client/process',
    grant_type: 'authorization_code',
    client_secret: 'somesecret'
  };
  var req = {
    headers: {}
  , form: {complete: function(callback){callback(null, params)}}
  };
  var res = {
    writeHead: function(status_code, headers) {
      assert.equal(status_code, 200);
      assert.deepEqual(headers, { 
        'Content-Type': 'application/json'
      , 'Cache-Control': 'no-store'
      });
    }
  , end: function(body) {
      assert.equal(body, '{"a":"b"}');
    }
  };
  expect_oauth_error(res, 'oat', 'invalid_grant');
  server.token_endpoint(req, res);
}],

];

