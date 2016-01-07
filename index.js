"use strict"

// Get the boom library for errors.
const Boom = require("boom")

// Get the user model.
const session = require("./lib/session_model")

// Get the validation library.
const joi = require("joi")

class Multicolour_Auth_OAuth extends Map {

  constructor(generator) {
    // Construct.
    super()

    // Get the host.
    const host = generator.request("host")

    // Set the defaults.
    this
      .set("auth_config", "session_store")
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

    generator
      // Get the token for use in the routes.
      .reply("auth_config", this.get("auth_config"))

      // Add another header to validate.
      .request("header_validator")
        .set("authorization", joi.string().required())

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

    // Get the handlers.
    const handlers = this.handlers()
    const headers = joi.object(host.request("header_validator").get()).options({ allowUnknown: true })
    delete headers.authorization

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

      // Get any other info about this provider,
      // ignore any errors here.
      const provider = require(`./lib/providers/${auth_config.provider}`)
      provider.get_extra_routes(host, server)
    })

    const strategies = this.get("auth_names")

    // Register some auth routes.
    server.route([
      {
        method: "GET",
        path: `/session`,
        config: {
          auth: { strategies },
          handler: (request, reply) => {
            // Get the handlers.
            const handlers = require("multicolour/lib/handlers")

            // Get the model.
            const model = host.get("database").get("models").session

            // Set the host on the handlers.
            handlers.set_host(host)

            // Run the query.
            handlers.GET.bind(model)(request, (err, models) =>
              reply[host.request("decorator")](err || models, model))
          },
          description: `Get your session and profile.`,
          notes: `Get your session and profile.`,
          tags: ["api", "auth"],
          validate: { headers }
        }
      },
      {
        method: "DELETE",
        path: `/session`,
        config: {
          auth: {
            strategies,
            scope: [ "user" ]
          },
          handler: handlers.get("destroy"),
          description: `Delete a session.`,
          notes: `Delete a session permanently.`,
          tags: ["api", "auth"],
          validate: { headers }
        }
      },
      {
        method: "POST",
        path: `/session/login`,
        config: {
          auth: false,
          handler: handlers.get("from_username_password"),
          description: "Login as a user using username and password.",
          notes: "Create a session with user credentials.",
          tags: ["api", "auth"],
          validate: {
            payload: joi.object({
              username: joi.string().required(),
              password: joi.string().required()
            }),
            headers
          }
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

    // Get any redirect config.
    const redirect_to = host.get("config").get("auth").redirect

    // Get the models.
    const models = host.get("database").get("models")

    // Get the user and session models.
    const users = models.user
    const sessions = models.session

    // Get utils from Multicolour.
    const utils = require("multicolour/lib/utils")

    // Create the session.
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
        reply[host.request("decorator")](Boom.wrap(err))
      }
      else if (!found_user) {
        users.create({
          username: profile.profile.username,
          name: profile.profile.displayName,
          source: profile.provider,
          profile_image_url: profile.profile.raw.profile_image_url.replace(/_normal/, ""),
          requires_password: true,
          requires_email: true,
          salt: utils.create_salt(),
          role: "user"
        },
        (err, created_user) => {
          if (err) {
            reply[host.request("decorator")](Boom.wrap(err))
          }
          else {
            // Add the user id to the session record.
            session.user = created_user.id

            // Create the session.
            sessions.create(session, err => {
              if (err) {
                reply[host.request("decorator")](Boom.wrap(err))
              }
              // If there's a configured redirect, do that.
              else if (redirect_to) {
                reply.redirect(`${redirect_to}/${session.token}`)
              }
              else {
                sessions.find(session).populate("user").exec((err, new_session) => {
                  if (err) {
                    reply[host.request("decorator")](Boom.wrap(err), sessions)
                  }
                  else {
                    // Redirect.
                    reply[host.request("decorator")](new_session, sessions)
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
            reply[host.request("decorator")](Boom.wrap(err), sessions)
          }
          else {
            sessions.find(session).populate("user").exec((err, new_session) => {
              if (err) {
                reply[host.request("decorator")](Boom.wrap(err), sessions)
              }
              // If there's a configured redirect, do that.
              else if (redirect_to) {
                reply.redirect(`${redirect_to}/${session.token}`)
              }
              else {
                // Reply.
                reply[host.request("decorator")](new_session, sessions)
              }
            })
          }
        })
      }
    })

    // Exit.
    return reply
  }

  from_username_password(request, reply) {
    // Get the host.
    const host = this.get("generator").request("host")

    // Get the models.
    const models = host.get("database").get("models")

    // Get utils from multicolour.
    const utils = require("multicolour/lib/utils")

    // Get the registered decorator.
    const decorator = host.request("decorator")

    // Get the user and session models.
    models.user.findOne({
      username: request.payload.username,
      requires_password: false
    }, (err, found_user) => {
      // Check for errors.
      if (err) {
        reply[decorator](Boom.wrap(err), models.session)
      }
      // Check we found a user by that username
      // that doesn't require a password.
      else if (!found_user) {
        reply[decorator](
          Boom.unauthorized("Incorrect username or password."),
          models.session
        )
      }
      // Otherwise, hash the password and search again.
      else {
        // Hash the password.
        utils.hash_password(request.payload.password, found_user.salt, password => {
          // Do another search for the user
          // with the hashed password & salt.
          models.user.findOne({
            username: request.payload.username,
            requires_password: false,
            password
          }, err => {
            // Check for errors.
            if (err) {
              reply[decorator](Boom.wrap(err), models.session)
            }
            // Check we found a user
            else if (!found_user) {
              reply[decorator](
                Boom.unauthorized("Incorrect username or password."),
                models.session
              )
            }
            // Create the session.
            else {
              models.session.create({
                token: utils.create_salt(),
                user: found_user.id
              }, (err, created_session) => {
                // Check for errors.
                if (err) {
                  reply[decorator](Boom.wrap(err), models.session)
                }
                else {
                  // Get the session and user details to form the reply.
                  models.session
                    .findOne(created_session)
                    .populate("user")
                    .exec((err, response) => {
                      if (err) {
                        reply[decorator](Boom.wrap(err), models.session)
                      }
                      else {
                        response.user = response.user.toJSON()
                        reply[decorator](response.toJSON(), models.session)
                      }
                    })
                }
              })
            }
          })
        })
      }
    })
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
      return reply[host.request("decorator")](Boom.unauthorized(request.auth.error.message))
    }

    // Get the host.
    const host = this.get("generator").request("host")

    // Get the models.
    const sessions = host.get("database").get("models").session

    // Destroy the record in the database.
    sessions.destroy({
      user: request.auth.credentials.user.id,
      token: request.headers.authorization.split(" ")[1]
    }, err => {
      if (err) {
        reply[host.request("decorator")](err, sessions)
      }
      else {
        reply({})
      }
    })

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
      ["destroy", this.destroy.bind(this)],
      ["from_username_password", this.from_username_password.bind(this)]
    ])
  }
}

// Export Multicolour_Auth_OAuth Multicolour
// to register and handle.
module.exports = Multicolour_Auth_OAuth
