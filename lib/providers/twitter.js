"use strict"

class Twitter {
  /**
   * Add app-only session creation support.
   * @param  {Multicolour} host on top of the server.
   * @param  {Hapi.Server} server to register the routes to.
   * @return {void}
   */
  static get_extra_routes(host, server) {
    // Get some tools.
    const Boom = require("boom")
    const joi = require("joi")

    // Add routes.
    server.route([
      {
        method: "GET",
        path: `/session/twitter/app`,
        config: {
          auth: false,
          handler: (request, reply) => {
            // Get some tools.
            const Manager = require("../session_manager")
            const Session_Manager = new Manager(host)
            const models = host.get("database").get("models")
            const users = models.user
            const sessions = models.session

            // Get the provider's config.
            const config = host
              .get("config").get("auth")
              .providers.filter(provider => provider.provider === "twitter")[0]

            // Verify the token with Twitter.
            this.verify_token(request, config, (err, response, tokens) => {
              // Check for errors.
              if (err) {
                reply[host.request("decorator")](Boom.create(500, err), sessions)
              }
              // Otherwise, try to find the user
              // and make sure they're an app.
              else {
                // Get or create the user/session in the request.
                Session_Manager.findUserOrCreate({
                  username: response.screen_name,
                  name: response.name,
                  source: "twitter"
                }, (err, user) => {
                  if (err) {
                    reply[host.request("decorator")](Boom.wrap(err), users)
                  }
                  else {
                    Session_Manager.findSessionOrCreate({
                      token: tokens.token,
                      verifier: tokens.secret,
                      user: user.id,
                      provider: "twitter"
                    }, user, (err, session) => {
                      if (err) {
                        reply[host.request("decorator")](Boom.wrap(err), sessions)
                      }
                      else {
                        reply[host.request("decorator")](session, sessions)
                      }
                    })
                  }
                })
              }
            })
          },
          description: "Verify a token with Twitter and create a session and or user.",
          notes: "Verify a token with Twitter and create a session and or user.",
          tags: ["api", "auth"],
          validate: {
            headers: joi.object({
              authorization: joi.string().required()
            }).options({ allowUnknown: true })
          }
        }
      }
    ])
  }

  /**
   * Create the payload for a new user with
   * the response from this service provider.
   * @param  {Hapi.Request} request made.
   * @return {Object} User object for inserting to data layer.
   */
  static create_user_payload(request) {
    // Get the profile from the request.
    const profile = request.auth.credentials

    // Return the object we need.
    return {
      username: profile.profile.username,
      name: profile.profile.displayName,
      source: "twitter",
      profile_image_url: profile.profile.raw.profile_image_url.replace(/_normal/, ""),
      requires_password: true,
      requires_email: true,
      role: "user"
    }
  }

  /**
   * Verify a token with Twitter's API.
   * @param  {Hapi.Request} req made.
   * @param  {Hapi.Response} reply interface.
   * @return {void}
   */
  static verify_token(req, config, callback) {
    // Get the request library.
    const request = require("request")

    // Get the tokens from the headers.
    const auth = req.headers.authorization.split(" ")
    auth.shift()

    // We'll populate this later.
    let tokens = {}

    // Check it's the right length.
    if (auth.length !== 2) {
      return callback(new Error("Authorization header incorrect format, 'OAuth token=YOUR_TOKEN secret=YOUR_SECRET'"), false)
    }
    // Otherwise, get the tokens.
    else {
      auth.forEach(property => {
        const parts = property.split("=")
        tokens[parts[0]] = parts[1]
      })
    }

    // Configure OAuth.
    const oauth = {
      consumer_key: config.clientId,
      consumer_secret: config.clientSecret,
      token: tokens.token,
      token_secret: tokens.secret
    }

    // Set up the request options.
    const request_options = {
      oauth,
      json: true,
      url: `https://api.twitter.com/1.1/account/verify_credentials.json`
    }

    // Make the request to Twitter.
    request(request_options, (error, response, body) => {
      if (error || body.errors) {
        callback(error || body.errors[0].message, false, tokens)
      }
      else {
        callback(null, body, tokens)
      }
    })
  }

}

module.exports = Twitter
