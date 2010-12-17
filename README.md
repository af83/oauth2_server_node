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

TBD


## Dependencies

oauth2_server_node uses [nodetk](https://github.com/AF83/nodetk) and [rest-mongo](https://github.com/AF83/rest-mongo):

 - nodetk is packaged via git submodules.
 - rest-mongo is NOT packaged via git submodules, but object having the same signature/behaviour as R or Rfactory() are expected by some functions. As so, it is probably the job of the program/library using oauth2_server_node to package rest-mongo.


## Projects using oauth2_server_node

A [wiki page](https://github.com/AF83/oauth2/wiki) lists the projects using oauth2_server_node. Don't hesitate to edit it.


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


