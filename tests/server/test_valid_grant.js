var assert = require('nodetk/testing/custom_assert')
  , server = require('../../lib/server')
  , oauth2 = require('../../lib/common')
  , tools = require('nodetk/testing/tools')
  , serializer = require('serializer')
  ;


// At the end of the tests, reset faked/mocked stuff:
var original_Date = Date;
oauth2.set_serializer(serializer);
exports.module_close = function(callback) {
  Date = original_Date;
  oauth2.set_serializer({});
  callback();
};


exports.tests = [

['Bad format (no "|")', 1, function() {
  server.valid_grant({}, {code: 'somestr'}, function(token) {
    assert.equal(token, null);
  }, function() {
    assert.ok(false, 'should not be called');
  });
}],

['Error requesting DB', 2, function() {
  var Grant = {getById: function(id, callback) {
    callback("error");
    assert.ok(true, 'must be called');
  }};
  server.valid_grant(Grant, {code: 'id.code'}, function(err, token) {
    assert.notEqual(err, null, 'should have an error');
  });
}],

['No grant | bad code | bad client_id | grant expired | invalid redirect_uri', 15, function() {
  Date.now = function(){return 60000}; // 0 + 1 minute
  var data = {code: 'id.CODE', client_id: 'cid', redirect_uri: "redirect_uri"};
  [ null // no grant
  , {client_id: 'cid', code: 'WRONG', time: 50000, redirect_uri: "redirect_uri"} // bad code
  , {client_id: 'wrong', code: 'CODE', time: 50000, redirect_uri: "redirect_uri"} // bad client_id
  , {client_id: 'cid', code: 'CODE', time: -1, redirect_uri: "redirect_uri"} // grant expired
  , {client_id: 'cid', code: 'CODE', time: 50000, redirect_uri: "bad_redirect_uri"}
  ].forEach(function(retrieved_token) {
    var Grant = {getById: function(id, callback) {
      callback(null, retrieved_token);
      assert.ok(true, 'must be called');
    }};
    server.valid_grant(Grant, data, function(err, token) {
      assert.equal(err, 'error in grant');
      assert.equal(token, null);
    });
  });
}],

['Error deleting grant from DB', 3, function() {
  Date.now = function(){return 60000}; // 0 + 1 minute
  var data = {code: 'id.CODE', client_id: 'cid'};
  var Grant = {getById: function(id, callback) {
    callback(null, {client_id: 'cid', code: 'CODE', time: 50000,
      del: function(callback) {
        callback('error');
        assert.ok(true, 'must be called');
    }});
    assert.ok(true, 'must be called');
  }};
  server.valid_grant(Grant, data, function(err, token) {
      assert.notEqual(err, null, 'should have an error');
  });
}],

['OK', 3, function() {
  Date.now = function(){return 60000}; // 0 + 1 minute
  var data = {code: 'id.CODE', client_id: 'cid'};
  var Grant = {getById: function(id, callback) {
    callback(null, {client_id: 'cid', code: 'CODE', time: 50000, user_id: 'uid',
      del: function(callback) {
        callback();
        assert.ok(true, 'must be called');
    }});
    assert.ok(true, 'must be called');
  }};
  server.valid_grant(Grant, data, function(err, token) {
    assert.deepEqual(token, {
      access_token: oauth2.create_access_token('uid', 'cid')
    });
  });
}],
];
