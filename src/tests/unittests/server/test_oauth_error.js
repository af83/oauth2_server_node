var assert = require('nodetk/testing/custom_assert')
  , server = require('../../../oauth2/server')
  , tools = require('nodetk/testing/tools')
  ;


exports.tests = [

['400 http response - eua', 2, function() {
  var res = tools.get_expected_res(400);
  server.oauth_error(res, 'eua', 'invalid_request');
}],

['400 http response - oat', 2, function() {
  var res = tools.get_expected_res(400);
  server.oauth_error(res, 'oat', 'invalid_request');
}],

];

