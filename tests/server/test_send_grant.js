var assert = require('nodetk/testing/custom_assert')
  , server = require('../../lib/server')
  , tools = require('nodetk/testing/tools')
  , extend = require('nodetk/utils').extend
  , querystring = require('querystring')
  ;


var test_send_grant_ok = function(state) {
  /* Test the send_grant fct when all is ok.
   *
   * Arguments:
   *  - state: an optional state.
   */
  var R = {Grant: function(data) {
    extend(this, data, {id: "grant_id", code: "grant_code"});
  }};
  R.Grant.prototype = {
    save: function(callback){callback()}
  };
  var qs = {code: "grant_id.grant_code"};
  if(state) qs.state = state;
  var loc = 'http://client/process?' + querystring.stringify(qs);
  var res = tools.get_expected_redirect_res(loc);
  var client_data = {client_id: 'cid', redirect_uri: 'http://client/process'};
  if(state) client_data.state = state;
  server.send_grant(res, R, 'uid', client_data);
};


exports.tests = [

['Check grant created with good data', 4, function() {
  var R = {
    Grant: function(data) {
      assert.equal(data.client_id, 'cid');
      assert.equal(data.user_id, 'uid');
      assert.ok(data.code);
      assert.ok(data.time);
    }
  };
  R.Grant.prototype = {save: function(){}};
  server.send_grant(null, R, 'uid', {client_id: 'cid'});
}],

['Error while saving grant', 3, function() {
  var R = {Grant: function(data) {}};
  R.Grant.prototype = {
    save: function(_, fallback){fallback("error")}
  };
  var res = tools.get_expected_res(500);
  server.send_grant(res, R, 'uid', {client_id: 'cid'});
}],

['No error, no state', 2, function() {
  test_send_grant_ok();
}],

['No error, state', 2, function() {
  test_send_grant_ok('somestate');
}],

];

