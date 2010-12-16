var assert = require('nodetk/testing/custom_assert')
  , server = require('../../../oauth2/server')
  ;


exports.expect_oauth_error = function(res, type, id) {
  /* Set expected values for next oauth_error call.
   * 3 asserts are done.
   */
  server.oauth_error = function(res_, type_, id_) {
    assert.equal(res_, res);
    assert.equal(type_, type);
    assert.equal(id_, id);
    server.oauth_error = function() {
      assert.ok(false, 'server.oauth_error fake called twice.');
    }
  };
};

