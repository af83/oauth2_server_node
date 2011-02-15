/*
 * This implements a OAuth2 server methods, as specified at:
 *  http://tools.ietf.org/html/draft-ietf-oauth-v2-10
 *
 * Only features the "web server" schema:
 *  http://tools.ietf.org/html/draft-ietf-oauth-v2-10#section-1.4.1
 *
 * Terminology:
 *  http://tools.ietf.org/html/draft-ietf-oauth-v2-10#section-1.2
 *
 */
var url = require('url')
  , querystring = require('querystring')

  , randomString = require('nodetk/random_str').randomString
  , SecureSerializer = require('nodetk/serializer').SecureSerializer
  , tools = require('nodetk/server_tools')
  , router = require('connect').router

  , oauth2 = require('./common')
  ;


var SERVER = exports;
// To be set by connect middleware: SERVER.RFactory, SERVER.authentication

SERVER.oauth_error = function(res, type, id) {
  /* Render a particula error.
   *
   * Arguments:
   *  - res
   *  - type: the class of the error ('eua' or 'oat').
   *  - id: the id of the error (invalid_request, invalid_client...).
   */
  res.writeHead(400, {'Content-Type': 'text/plain'});
  res.end(JSON.stringify({error: {
    type: 'OAuthException',
    message: id + ': ' + oauth2.ERRORS[type][id],
  }}));
};


var unknown_error = exports.unknown_error = function(res, err) {
  /* To call when an unknown error happens (server error).
   */
  // console.log(err.message);
  // console.log(err.stack);
  tools.server_error(res, err);
};


// Parameters we must/can have in different kinds of requests:
var PARAMS = exports.PARAMS = {
  eua: { // eua = end user authorization
    mandatory: ['client_id', 'response_type'],
    optional: ['state', 'scope', 'redirect_uri'],
    // possible values for response_type param:
    response_types: {'token': 1, 'code': 1, 'code_and_token': 1},
  },

  oat: { // oat = Obtaining an access token
    mandatory: ['grant_type', 'client_id', 'code', 'redirect_uri'],
    // client_secret might be provided with the 'Authorization: Basic ...' header
    optional: ['scope', 'client_secret'],
  },
};
PARAMS.eua.all = PARAMS.eua.mandatory.concat(PARAMS.eua.optional);


exports.send_grant = function(res, R, user_id, client_data, additional_info) {
  /* Create a grant and send it to the user.
   * The code sent is of the form: grand.id + '.' + grant.code
   *
   * Arguments:
   *  - req
   *  - res
   *  - R: rest-mongo instance
   *  - user_id: id of the user
   *  - client_data: hash, data about the client:
   *      - client_id
   *      - redirect_uri
   *      - state: str, optional, if given, will be sent with the grant.
   *  - additional_info: optional hash, anything you want to be stored with
   *    the grant.
   *
   */
  var grant = new R.Grant({
    client_id: client_data.client_id,
    time: Date.now(),
    user_id: user_id,
    code: randomString(128),
    redirect_uri: client_data.redirect_uri
  });
  if(additional_info) grant.additional_info = additional_info;
  grant.save(function() {
    var qs = {code: grant.id + '.' + grant.code};
    if(client_data.state) qs.state = client_data.state;
    qs = querystring.stringify(qs);
    tools.redirect(res, client_data.redirect_uri + '?' + qs);
  }, function(err) {
    unknown_error(res, err);
  });
};


SERVER.valid_grant = function(R, data, callback, fallback) {
  /* Valid the grant, call callback(token|null) or fallback(err),
   * token being a JSON object.
   * If valid, the grant is invalidated and cannot be used anymore.
   *
   * To be valid, a grant must exist, not be deprecated and have the right
   * associated client.
   *
   * Arguments:
   *  - R: rest-mongo instance
   *  - data:
   *   - code: grant code given by client.
   *   - client_id: the client id giving the grant
   *   - redirect_uri: the redirect_uri given with the grant
   *  - callback: to be called with a token if the grant was valid,
   *    or null otherwise.
   *  - fallback: to be called in case of error (an invalid grant is not
   *    an error).
   *
   */
  var id_code = data.code.split('.');
  if(id_code.length != 2) return callback(null);
  R.Grant.get({ids: id_code[0]}, function(grant) {
    var minute_ago = Date.now() - 60000;
    if(!grant || grant.time < minute_ago ||
       grant.client_id != data.client_id ||
       grant.code != id_code[1] ||
       grant.redirect_uri != data.redirect_uri
       ) return callback(null);
    var additional_info = grant.additional_info;
    // Delete the grant so that it cannot be used anymore:
    grant.delete_(function() {
      // Generate and send an access_token to the client:
      var token = {
        access_token: oauth2.create_access_token(grant.user_id, grant.client_id,
                                                 additional_info)
        // optional: expires_in, refresh_token, scope
      };
      callback(token);
    }, fallback);
  }, fallback);
};


var token_endpoint = exports.token_endpoint = function(req, res) {
  /* OAuth2 token endpoint.
   * Check the authorization_code, uri_redirect and client secret, issue a token.
   *
   * POST to config.oauth2.token_url
   *
   * Arguments:
   *  - req
   *  - res
   *
   */
  if(!req.form) return SERVER.oauth_error(res, 'oat', 'invalid_request');
  req.form.complete(function(err, params, files) {
    if(err) return SERVER.oauth_error(res, 'oat', 'invalid_request');
    var R = SERVER.RFactory();

    // We check there is no invalid_requet error:
    var error = false;
    params && PARAMS.oat.mandatory.forEach(function(param) {
      if(!params[param]) error = true;
    });
    if(error) return SERVER.oauth_error(res, 'oat', 'invalid_request');

    // We do only support 'authorization_code' as grant_type:
    if(params.grant_type != 'authorization_code')
      return SERVER.oauth_error(res, 'oat', 'unsupported_grant_type');

    // Check the client_secret is given once (and only once),
    // either by HTTP basic auth, or by client_secret parameter:
    var secret = req.headers['authorization'];
    if(secret) {
      if(params.client_secret)
        return SERVER.oauth_error(res, 'oat', 'invalid_request');
      params.client_secret = secret.slice(6); // remove the leading 'Basic'
    }
    else if(!params.client_secret) {
      return SERVER.oauth_error(res, 'oat', 'invalid_request');
    }

    // Check the client_id exists and does have correct client_secret:
    R.Client.get({ids: params.client_id}, function(client) {
      if(!client || client.secret != params.client_secret)
        return SERVER.oauth_error(res, 'oat', 'invalid_client');

      var data = {code: params.code, client_id: client.id, redirect_uri: params.redirect_uri};
      SERVER.valid_grant(R, data, function(token) {
        if(!token) return SERVER.oauth_error(res, 'oat', 'invalid_grant');
        res.writeHead(200, { 'Content-Type': 'application/json'
                           , 'Cache-Control': 'no-store'
                           });
        res.end(JSON.stringify(token));
      }, function(err) { unknown_error(res, err) });
    }, function(err) { unknown_error(res, err) });
  });
};


SERVER.authorize = function(params, req, res) {
  /* OAuth2 Authorize function.
   * Serve an authentication form to the end user at browser.
   *
   *  This function should only be called by oauth2.authorize
   *
   * Arguments:
   *  - params:
   *  - req
   *  - res
   *
   */
  // We check there is no invalid_requet error:
  var error = false;
  PARAMS.eua.mandatory.forEach(function(param) {
    if(!params[param]) error = true;
  });
  if(error) return SERVER.oauth_error(res, 'eua', 'invalid_request');
  if(!PARAMS.eua.response_types[params.response_type])
    return SERVER.oauth_error(res, 'eua', 'unsupported_response_type');

  // XXX: For now, we only support 'code' response type
  // which is used in case of a web server (Section 1.4.1 in oauth2 spec draft 10)
  // TODO: make it more compliant with the specs
  if(params.response_type != "code") {
    res.writeHead(501, {'Content-Type': 'text/plain'});
    res.end('Only code request type supported for now ' +
            '(schema 1.4.1 in oauth2 spec draft 10).');
    return;
  }

  var R = SERVER.RFactory();
  R.Client.get({ids: params.client_id}, function(client) {
    if(!client) return SERVER.oauth_error(res, 'eua', 'invalid_client');
    // Check the redirect_uri is the one we know about (if we do):
    if(client.redirect_uri && params.redirect_uri
       && client.redirect_uri != params.redirect_uri) {
      return SERVER.oauth_error(res, 'eua', 'redirect_uri_mismatch');
    }
    var redirect_uri = client.redirect_uri || params.redirect_uri;
    // Eveything is allright, ask the user to sign in.
    SERVER.authentication.login(req, res, {
      client_id: client.id,
      client_name: client.name,
      redirect_uri: redirect_uri,
      state: params.state
    });
  }, function(err) { unknown_error(res, err) });
};


SERVER.authorize_endpoint = function(req, res) {
  /* OAuth2 Authorize end-point.
   * Serve an authentication form to the end user at browser.
   *
   *  GET or POST on config.oauth2.authorize_url
   *
   * Arguments:
   *  - req
   *  - res
   *
   */
  if (req.method == 'GET') {
    var params = url.parse(req.url, true).query;
    return SERVER.authorize(params, req, res);
  } else {
    if(!req.form) return SERVER.oauth_error(res, 'eua', 'invalid_request');
    req.form.complete(function(err, fields, files) {
      if(err) return SERVER.oauth_error(res, 'eua', 'invalid_request');
      SERVER.authorize(fields, req, res);
    });
  }
};


exports.connector = function(config, RFactory, authentication) {
  /* Returns Oauth2 server connect middleware.
   *
   * This middleware will intercept requests aiming at OAuth2 server
   * and treat them.
   *
   * Arguments:
   *  - config, hash containing:
   *    - authorize_url: end-user authorization endpoint,
   *      the URL the end-user must be redirected to to be served the
   *      authentication form.
   *    - token_url: OAuth2 token endpoint,
   *      the URL the client will use to check the authorization_code given by
   *      user and get a token.
   *    - crypt_key: string, encryption key used to crypt information contained
   *      in the issued tokens. This is a symmetric key and must be kept secret.
   *    - sign_key: string, signature key used to sign issued tokens.
   *      This is a symmetric key and must be kept secret.
   *  - RFactory: RFactory object initialized whith minimal schema info
   *    (Grant and Client objects). cf. README file for more info.
   *  - authentication: module (or object) defining the following functions:
   *    * login: function to render the login page to end user in browser.
   *    * process_login: to process the credentials given by user.
   *      This function should use the send_grant function once user is
   *      authenticated.
   *
   */
  var sserializer = new SecureSerializer(config.crypt_key, config.sign_key);
  oauth2.set_serializer(sserializer);
  SERVER.RFactory = RFactory;
  SERVER.authentication = authentication;
  return router(function(app) {
    app.get(config.authorize_url, SERVER.authorize_endpoint);
    app.post(config.authorize_url, SERVER.authorize_endpoint);
    app.post(config.process_login_url, authentication.process_login);
    app.post(config.token_url, token_endpoint);
  });
};

var common = require('./common');

exports.set_serializer = common.set_serializer;
exports.ERRORS = common.ERRORS;
exports.create_access_token = common.create_access_token;
exports.token_info = common.token_info;
exports.check_token = common.check_token;
