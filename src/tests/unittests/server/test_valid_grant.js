var assert = require('nodetk/testing/custom_assert')
  , server = require('../../../oauth2/server')
  , oauth2 = require('../../../oauth2/common')
  , tools = require('nodetk/testing/tools')
  , serializer = require('nodetk/serializer')
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
  var R = {Grant: {get: function(query, callback, fallback) {
    fallback("error");
    assert.ok(true, 'must be called');
  }}};
  server.valid_grant(R, {code: 'id.code'}, function(token) {
    assert.ok(false, 'should not be called');
  }, function() {
    assert.ok(true, 'must be called');
  });
}],

['No grant | bad code | bad client_id | grant expired', 8, function() {
  Date.now = function(){return 60000}; // 0 + 1 minute
  var data = {code: 'id.CODE', client_id: 'cid'};
  [ null // no grant
  , {client_id: 'cid', code: 'WRONG', time: 50000} // bad code
  , {client_id: 'wrong', code: 'CODE', time: 50000} // bad client_id
  , {client_id: 'cid', code: 'CODE', time: -1} // grant expired
  ].forEach(function(retrieved_token) {
    var R = {Grant: {get: function(query, callback, fallback) {
      callback(retrieved_token);
      assert.ok(true, 'must be called');
    }}};
    server.valid_grant(R, data, function(token) {
      assert.equal(token, null);
    }, function() {
      assert.ok(false, 'should not be called');
    });
  });
}],

['Error deleting grant from DB', 3, function() { 
  Date.now = function(){return 60000}; // 0 + 1 minute
  var data = {code: 'id.CODE', client_id: 'cid'};
  var R = {Grant: {get: function(query, callback, fallback) {
    callback({client_id: 'cid', code: 'CODE', time: 50000, 
      delete_: function(callback, fallback) {
        fallback('error');
        assert.ok(true, 'must be called');
    }});
    assert.ok(true, 'must be called');
  }}};
  server.valid_grant(R, data, function(token) {
    assert.ok(false, 'should not be called');
  }, function() {
    assert.ok(true, 'must be called');
  });
}],

['OK', 3, function() { 
  Date.now = function(){return 60000}; // 0 + 1 minute
  var data = {code: 'id.CODE', client_id: 'cid'};
  var R = {Grant: {get: function(query, callback, fallback) {
    callback({client_id: 'cid', code: 'CODE', time: 50000, user_id: 'uid',
      delete_: function(callback, fallback) {
        callback();
        assert.ok(true, 'must be called');
    }});
    assert.ok(true, 'must be called');
  }}};
  server.valid_grant(R, data, function(token) {
    assert.deepEqual(token, {
      access_token: oauth2.create_access_token('uid', 'cid')
    });
  }, function() {
    assert.ok(false, 'should not be called');  
  });
}],

];

