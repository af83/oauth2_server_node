# OAuth2 Server in Node

## Description

  oauth2_server_node is a node library providing the bases to implement an OAuth2 server. It features a [connect](https://github.com/senchalabs/connect) middleware to ease the integration with any other components.

It implements the OAuth2 [web server schema](http://tools.ietf.org/html/draft-ietf-oauth-v2-10#section-1.4.1) as specified by the [draft 10 of the OAuth2 specification](http://tools.ietf.org/html/draft-ietf-oauth-v2-10).

This project will follow the specification evolutions, so a branch for the [draft 11](http://tools.ietf.org/html/draft-ietf-oauth-v2-11) will soon be created.


## Similar projects

oauth2_server_node is developed together with:

 - [oauth2_client_node](https://github.com/AF83/oauth2_client_node), a connect middleware featuring an OAuth2 client.
 - [auth_server](https://github.com/AF83/auth_server), an authentication and authorization server in node (using both oauth2_client_node and oauth2_server_node).


## Usage

OAuth2_server_node is a library providing OAuth2 related methods and tools, no more. As such, you will have to set-up a certain amount of initializations / declarations to use it. A good example on how to use it is the [auth_server](https://github.com/AF83/auth_server) project.

To create an OAuth2 server using oauth2_server_node, you need to get a connector using the oauth2/server.connector function. This function needs three parameters:

 - a config obj, containing:
  - authorize_url: end-user authorization endpoint, the URL the end-user must be redirected to to be served the authentication form.
  - process_login_url: the url the authentication form will POST to.
  - token_url: OAuth2 token endpoint, the URL the client will use to check the authorization_code given by user and get a token.
  - crypt_key: string, encryption key used to crypt information contained in the issued tokens. This is a symmetric key and must be kept secret.
  - sign_key: string, signature key used to sign (HMAC) issued tokens. This is a symmetric key and must be kept secret.
 - a RFactory obj as defined by [rest-mongo](https://github.com/AF83/rest-mongo) (a JS ORM using Mongodb - or others means - as a backend). It is used to get an R object, providing classes and methods to easily access the DB. This factory needs to be initialized with a schema containing at least the following resources:
   - Grant, corresponding the grant issued to an OAuth2 client through the end-user, and containing the following properties:
     - client_id: the client id associated with the grant
     - user_id: the user id associated with the grant
     - code: the grant code (the code sent to client is: grant.id|grant.code)
     - time: when the grant was issued, POSIX time
     - redirect_uri: the redirect_uri associated with the grant
     - additional_info: JSON object containing arbitrary data
   - Client, corresponding to an OAuth2 client, and containing the following properties:
     - id: the OAuth2 client id
     - name: the OAuth2 client name
     - secret: the secret shared with the OAuth2 client
     - redirect_uri: the redirecting url associated with the client
 - an authentication object, providing the following functions:
  - login: function to render the login page to end user in browser.
  - process_login: to process the credentials given by user. This function should use the oauth2/server.send_grant function once user is authenticated.


The returned middleware will take care of requests addressed to the OAuth2 server, using the objects/functions it was given during initialization. You may want to create a resource server then. The oauth2/common.js provides a check_token function which might be helpful in that. This function will check the token in request parameter and give you associated info, or deny access to client (in case of bad token).


## Dependencies

oauth2_server_node uses [nodetk](https://github.com/AF83/nodetk), [rest-mongo](https://github.com/AF83/rest-mongo) and [connect](https://github.com/senchalabs/connect).

## Projects using oauth2_server_node

A [wiki page](https://github.com/AF83/oauth2_server_node/wiki) lists the projects using oauth2_server_node. Don't hesitate to edit it.


## License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see [http://www.fsf.org/licensing/licenses/agpl-3.0.html](http://www.fsf.org/licensing/licenses/agpl-3.0.html).


