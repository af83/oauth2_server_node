var assert = require('nodetk/testing/custom_assert')
  , server = require('../../../oauth2/server')
  , tools = require('nodetk/testing/tools')
  ;


exports.tests = [

['Test result', 1, function() {
  var access_token = server.create_access_token('uid', 'cid');
  assert.equal(access_token, 'uid,cid');
}],

];

