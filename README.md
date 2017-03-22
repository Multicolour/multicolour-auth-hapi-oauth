# multicolour-auth-oauth

[![Build Status](https://travis-ci.org/Multicolour/multicolour-auth-hapi-oauth.svg?branch=master)](https://travis-ci.org/Multicolour/multicolour-auth-hapi-oauth)
[![Coverage Status](https://coveralls.io/repos/github/Multicolour/multicolour-auth-hapi-oauth/badge.svg?branch=master)](https://coveralls.io/github/Multicolour/multicolour-auth-hapi-oauth?branch=master)
[![Dependency Status](https://david-dm.org/Multicolour/multicolour-auth-hapi-oauth.svg)](https://david-dm.org/Multicolour/multicolour-auth-hapi-oauth)

OAuth auth plugin for Multicolour Servers, is a wrapper around the [Bell][bell] library.

> bell ships with built-in support for authentication using Facebook, GitHub, Google, Instagram, LinkedIn, Twitter, Yahoo, Foursquare, VK, ArcGIS Online, Windows Live, Nest, Phabricator, BitBucket, Dropbox, Reddit and Tumblr. It also supports any compliant OAuth 1.0a and OAuth 2.0 based login services with a simple configuration object.

To use:

```js
"use strict"

// Configure our service.
const my_service = require("multicolour")
  // Configure the service core and scan for content.
  .new_from_config_file_path("./config.js")
  .scan()

  // Register the server plugin.
  .use(require("multicolour-server-hapi"))

  // Register the auth plugin to the server.
  .get("server")
    .use(require("multicolour-auth-oauth"))

// Start the service.
my_service.start()

```

## Config

Your config is where you will enter your providers, you must be sure that you have created the necessary apps for relevant services before you will be able to authenticate with them.

If, for example you wanted to have a Login With Twitter, Facebook & Github your config might look something like:

```js
{
...
  auth: {
    password: "YOUR SECURE COOKIE PASSWORD HERE",
    redirect: "http://localhost:1811/user-logged-in",
    providers: [
      {
        provider: "twitter",
        clientId: "YOUR CLIENT ID HERE",
        clientSecret: "YOUR CLIENT SECRET HERE"
      },
      {
        provider: "github",
        clientId: "YOUR CLIENT ID HERE",
        clientSecret: "YOUR CLIENT SECRET HERE"
      },
      {
        provider: "facebook",
        clientId: "YOUR CLIENT ID HERE",
        clientSecret: "YOUR CLIENT SECRET HERE"
      }
    ]
  },
...
}

```

This will create several new endpoints which are visible on your `multicolour` docs page under the `session` endpoint.

## Redirects

By default, when you auth with a provider you'll be redirected to the resulting session model, this is unlikely to be what you wanted so you configure this by setting the `redirect` property in the auth config.

[bell]: https://github.com/hapijs/bell
