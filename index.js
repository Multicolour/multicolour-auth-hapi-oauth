"use strict"

// Get the boom library for errors.
const Boom = require("boom")

// Get the user model.
const session = require("./lib/session_model")

class Multicolour_Auth_OAuth extends Map {

  constructor(generator) {
    // Construct.
    super()

    // Get the host.
    const host = generator.request("host")

    // Set the defaults.
    this
      .set("auth_names", ["session_store"])
      .set("generator", generator)
      .set("sessions", session(host.get("env")))
  }

  /**
   * Register any plugins on the server, called by
   * the server plugin.
   * @param  {Function} generator that instantiates this plugin.
   * @return {Multicolour_Auth_OAuth} Object for chaining.
   */
  register(generator) {
    // Get the host and server.
    const host = generator.request("host")
    const server = generator.request("raw")

    // Get the config.
    const config = host.get("config").get("auth")

    // Register the session model with the hosting Multicolour's Waterline instance.
    host.request("waterline").loadCollection(this.get("sessions"))

    // Register the plugins to the server.
    server.register([
      require("bell"),
      require("./lib/hapi-db-plugin")
    ], error => {
      // Check for errors.
      if (error) {
        throw error
      }

      // Register the auth strategies.
      config.providers.forEach(auth_config => {
        // Add the password to the config.
        auth_config.password = config.password

        // Configure the strategy.
        server.auth.strategy(auth_config.provider, "bell", auth_config)
      })

      // We'll use cookies to store the session for now.
      server.auth.strategy("session_store", "session_store", { host })
      server.auth.default("session_store")
    })

    // Get the token for use in the routes.
    generator.set("auth_names", this.get("auth_names"))

    // Get the handlers.
    const handlers = this.handlers()

    // Create login/register endpoints with the config.
    config.providers.forEach(auth_config => {
      /* istanbul ignore next : Not testable */
      server.route({
        method: ["GET", "POST"],
        path: `/session/${auth_config.provider}`,
        config: {
          auth: {
            strategy: auth_config.provider,
            mode: "try"
          },
          handler: handlers.get("create"),
          description: `Create a new session/user using "${auth_config.provider}"`,
          notes: `Create a new session/user using "${auth_config.provider}"`,
          tags: ["api", "auth", auth_config.provider]
        }
      })
    })

    // Register some auth routes.
    server.route([
      {
        method: "DELETE",
        path: `/session`,
        config: {
          auth: {
            strategies: this.get("auth_names")
          },
          handler: handlers.get("destroy"),
          description: `Delete a session.`,
          notes: `Delete a session permanently.`,
          tags: ["api", "auth"]
        }
      }
    ])

    return this
  }

  /**
   * Create a new session if the request is authorised.
   * @param  {Request} request object.
   * @param  {Reply} reply interface.
   * @return {Reply} Reply interface for internal use.
   */
  create(request, reply) {
    // Get the profile from the request.
    const profile = request.auth.credentials

    // Get the host.
    const host = this.get("generator").request("host")

    // Get the auth config.
    const config = host.get("config").get("auth")

    // Get the models.
    const models = host.get("database").get("models")

    // Get the user and session models.
    const users = models.user
    const sessions = models.session

    // Create the session row.
    const session = {
      token: request.url.query.oauth_token,
      verifier: request.url.query.oauth_verifier,
      user: null,
      provider: profile.provider
    }

    // If it's not an authorised request, exit.
    if (!request.auth.isAuthenticated || !profile) {
      return reply(Boom.unauthorized(request.auth.error.message))
    }

    // Check for the user to see if they have
    // an account, if they don't we'll create
    // one for them and log them in with it.
    users.findOne({ username: profile.profile.username }, (err, found_user) => {
      if (err) {
        reply(Boom.wrap(err))
      }
      else if (!found_user) {
        users.create({
          username: profile.profile.username,
          name: profile.profile.displayName,
          source: profile.provider,
          profile_image_url: profile.profile.raw.profile_image_url.replace(/_normal/, ""),
          requires_password: true,
          requires_email: true
        },
        (err, created_user) => {
          if (err) {
            reply(Boom.wrap(err))
          }
          else {
            // Add the user id to the session record.
            session.user = created_user.id

            // Create the session.
            sessions.create(session, err => {
              if (err) {
                reply(Boom.wrap(err))
              }
              else {
                sessions.find(session).populate("user").exec((err, new_session) => {
                  if (err) {
                    reply(Boom.wrap(err))
                  }
                  else {
                    // Redirect.
                    reply(new_session)
                  }
                })
              }
            })
          }
        })
      }
      else {
        // Add the user id to the session record.
        session.user = found_user.id

        // Create the session.
        sessions.create(session, err => {
          if (err) {
            reply(Boom.wrap(err))
          }
          else {
            sessions.find(session).populate("user").exec((err, new_session) => {
              if (err) {
                reply(Boom.wrap(err))
              }
              else {
                // Redirect.
                reply(new_session)
              }
            })
          }
        })
      }
    })

    // Exit.
    return reply
  }

  /**
   * Destroy the session.
   * @param  {Request} request object.
   * @param  {Reply} reply interface.
   * @return {Reply} Reply interface for internal use.
   */
  destroy(request, reply) {
    // If it's not an authorised request, exit.
    if (!request.auth.isAuthenticated) {
      return reply(Boom.unauthorized(request.auth.error.message))
    }

    // Get the host.
    const host = this.get("generator").request("host")

    // Get the models.
    const session = host.get("database").get("models").session

    // Keep on swimming, keep on swimming.
    reply.continue()

    return reply
  }

  /**
   * Return references to the handlers for creating
   * and destroying sessions. Consumed by the server generator.
   * @return {Map} Map with create and destroy methods.
   */
  handlers() {
    return new Map([
      ["create", this.create.bind(this)],
      ["destroy", this.destroy.bind(this)]
    ])
  }
}

// Export Multicolour_Auth_OAuth Multicolour
// to register and handle.
module.exports = Multicolour_Auth_OAuth
