var assert = require('nodetk/testing/custom_assert')
  , server = require('../../lib/server')
  , tools = require('nodetk/testing/tools')
  , expect_oauth_error = require('./tools').expect_oauth_error
  , extend = require('nodetk/utils').extend
  ;


// To reinit some faked / mocked stuff in the end:
original_RFactory = server.RFactory;
original_authentication = server.authentication;
original_oauth_error = server.oauth_error;
var reinit = function(callback) {
  server.RFactory = original_RFactory;
  server.authentication = original_authentication;
  server.oauth_error = original_oauth_error;
  callback();
};

exports.module_close = reinit;
exports.setup = reinit;

function assert_authorize_ok(params) {
  // make 3 assertions
  var res = "res obj", req = {};
  server.authentication = {login: function(req_, res_, data) {
    assert.equal(res, res_);
    assert.equal(req, req_);
    assert.deepEqual(data, {
      client_id: 'cid'
    , client_name: 'cname'
    , redirect_uri: 'some_uri'
    , state: 'somestate'
    });
  }};
  server.authorize(params, req, res);
}

exports.tests = [

['Missing parameter', 9, function() {
  var params = {client_id: 1, response_type: 1, redirect_uri: 1};
  Object.keys(params).forEach(function(missing_param) {
    var mparams = extend(params);
    delete mparams[missing_param];
    var res = "res obj", req = {};
    expect_oauth_error(res, 'eua', 'invalid_request');
    server.authorize(params, req, res);
  });
}],

['Unsupported response_type', 3, function() {
  var params = {client_id: 1, response_type: 1, redirect_uri: 1};
  var res = "res obj", req = {};
  expect_oauth_error(res, 'eua', 'unsupported_response_type');
  server.authorize(params, req, res);
}],

['Unsupported response_type (token and code_and_token)', 6, function() {
  server.RFactory = function(){ // To be sure the server stop after replying
    assert.ok(false, 'Must not be called');
  }
  var params = {client_id: 1, redirect_uri: 1};
  var req = {};
  ['token', 'code_and_token'].forEach(function(type) {
    var params2 = extend({response_type: type}, params);
    var res = tools.get_expected_res(501);
    server.authorize(params2, req, res);
  });
}],

['No client retrieved from DB', 3, function() {
  server.RFactory = function() {return {
    Client: {get: function(query, callback) {
      callback(null);
    }}
  }};
  var params = {client_id: 1, response_type: 'code', redirect_uri: 1};
  var res = "res obj", req = {};
  expect_oauth_error(res, 'eua', 'invalid_client');
  server.authorize(params, req, res);
}],

['Mismatching redirect_uri', 3, function() {
  server.RFactory = function() {return {
    Client: {get: function(query, callback) {
      callback({redirect_uri: 'other_uri'});
    }}
  }};
  var params = {client_id: 1, response_type: 'code', redirect_uri: 'some_uri'};
  var res = "res obj", req = {};
  expect_oauth_error(res, 'eua', 'redirect_uri_mismatch');
  server.authorize(params, req, res);
}],

['Error while retrieving client from DB', 3, function() {
  server.RFactory = function() {return {
    Client: {get: function(query, callback, fallback) {
      fallback('error');
    }}
  }};
  var params = {client_id: 1, response_type: 'code', redirect_uri: 1};
  var req = {};
  var res = tools.get_expected_res(500);
  server.authorize(params, req, res);
}],

['Client without redirect_uri but with redirect_uri param: OK', 3, function() {
  server.RFactory = function() {return {
    Client: {get: function(query, callback) {
      callback({id: 'cid', name: 'cname', redirect_uri: ''});
    }}
  }};
  var params = {client_id: 'cid', response_type: 'code', redirect_uri: 'some_uri', state: 'somestate'};
  assert_authorize_ok(params);
}],

['Client with redirect_uri but without redirect_uri param: OK', 3, function() {
  server.RFactory = function() {return {
    Client: {get: function(query, callback) {
      callback({redirect_uri: 'some_uri', name: 'cname', id: 'cid'});
    }}
  }};
  var params = {client_id: 'cid', response_type: 'code',
                state: 'somestate'};
  assert_authorize_ok(params);
}],

['Client with redirect_uri and redirect_uri param: OK', 3, function() {
  server.RFactory = function() {return {
    Client: {get: function(query, callback) {
      callback({redirect_uri: 'some_uri', name: 'cname', id: 'cid'});
    }}
  }};
  var params = {client_id: 'cid', response_type: 'code',
                redirect_uri: 'some_uri', state: 'somestate'};
  assert_authorize_ok(params);
}],

];
