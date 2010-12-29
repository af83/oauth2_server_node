var assert = require('nodetk/testing/custom_assert')
  , oauth2 = require('../../../oauth2/common')
  ;


exports.tests = [

['create_access_token & token_info bijection', 1, function() {
  var access_token = oauth2.create_access_token('uid', 'cid', {info: "data"});
  var info = oauth2.token_info(access_token);
  assert.deepEqual(info, {
    user_id: 'uid'
  , client_id: 'cid'
  , additional_info: {info: "data"}
  });
}],

];

