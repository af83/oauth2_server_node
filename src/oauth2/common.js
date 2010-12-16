/* 
 * Common OAuth2 stuff.
 *
 */


var ERRORS = exports.ERRORS = {
  eua: { // eua = end user authorization
    // http://tools.ietf.org/html/draft-ietf-oauth-v2-10#section-3.2.1
    invalid_request: 'The request is missing a required parameter, includes ' +
                     'an unsupported parameter or parameter value, or is ' +
                     'otherwise malformed.',
    invalid_client: 'The client identifier provided is invalid.',
    unauthorized_client: 'The client is not authorized to use the requested ' +
                         'response type.',
    redirect_uri_mismatch: 'The redirection URI provided does not match a ' +
                           'pre-registered value.',
    access_denied: 'The end-user or authorization server denied the request.',
    unsupported_response_type: 'The requested response type is not supported ' +
                               'by the authorization server.',
    invalid_scope: 'The requested scope is invalid, unknown, or malformed.',
  },

  oat: { // oat = Obtaining an access token
    // http://tools.ietf.org/html/draft-ietf-oauth-v2-10#section-4.3.1
    invalid_request: 'The request is missing a required parameter, includes ' +
                     'an unsupported parameter or parameter value, repeats ' +
                     'a parameter, includes multiple credentials, utilizes ' +
                     'more than one mechanism for authenticating the client, ' +
                     'or is otherwise malformed.',
    invalid_client: 'The client identifier provided is invalid, ' +
                    'the client failed to authenticate, the client did not ' +
                    'include its credentials, provided multiple client ' +
                    'credentials, or used unsupported credentials type.',
    unauthorized_client: 'The authenticated client is not authorized to use ' +
                         'the access grant type provided.',
    invalid_grant: 'The provided access grant is invalid, expired, or ' +
                   'revoked (e.g. invalid assertion, expired authorization' + 
                    'token, bad end-user password credentials, or ' +
                    'mismatching authorization code and redirection URI).',
    unsupported_grant_type: 'The access grant included - its type or another ' +
                           'attribute - is not supported by the ' +
                           'authorization server.',
    invalid_scope: 'The requested scope is invalid, unknown, malformed, ' +
                   'or exceeds the previously granted scope.'
  },

  apr: { // ap = Accessing a protected resource
    // http://tools.ietf.org/html/draft-ietf-oauth-v2-10#section-5.2.1
    invalid_request:
         "The request is missing a required parameter, includes an " +
         "unsupported parameter or parameter value, repeats the same " +
         "parameter, uses more than one method for including an access " +
         "token, or is otherwise malformed.",
    invalid_token: "The access token provided is invalid.",
    expired_token: "The access token provided has expired.",
    insufficient_scope: "The request requires higher privileges than " +
                        "provided by the access token.",
  },
};

// -------------------------------------------------------

var URL = require('url');


var token_info = exports.token_info = function(token) {
  /* Returns the information associated with a token, or null if token is bad.
   */
  // TODO: encrypt the token somehow to check it is valid...
  // + limit its scope and lifetime.
  try {
    var token_parts = token.split(',');
    var info = {
      user_id: token_parts[0],
      client_id: token_parts[1],
    };
    if(!info.user_id || !info.client_id) return null;
    return info;
  } catch(e) {
    return null;
  }
};


exports.check_token = function(req, res, callback) {
  /* Check the OAuth2 oauth_token present in request. Either returns http error
   * to client or call callback with info about token, a hash containing clear
   * info the token was transporting.
   *
   * Arguments:
   *  - req: nodejs request object.
   *  - res: nodejs response object.
   *  - callback: function to be called with info as first parameter.
   *
   * NOTE: the function is asynchronous even it doesn't have to be right now,
   * but it might be in the future.
   *
   */
  var params = URL.parse(req.url, true).query
    , oauth_token = params.oauth_token
    ;
  if(req.headers.authorization) {
    // XXX: support for getting oauth_token from header might not be complete
    // http://tools.ietf.org/html/draft-ietf-oauth-v2-10#section-5.1.1
    var match = req.headers.authorization.match(/OAuth\s+(.*)/);
    if(match) {
      if(oauth_token) {
        res.writeHead(400, {'Content-Type': 'text/html'});
        res.end('oauth_token can only be given using one method.');
        return;
      }
      oauth_token = match[1];
    }
  }
  var info = token_info(oauth_token);
  if(!info) {
    res.writeHead(400, {'Content-Type': 'text/html'});
    res.end('Invalid oauth_token.');
    return;
  }
  callback(info);
};

