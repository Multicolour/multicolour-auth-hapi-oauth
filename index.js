"use strict"

// Get the boom library for errors.
const Boom = require("boom")

// Get the user model.
const user = require("./lib/user_model")

class Multicolour_Auth_OAuth extends Map {

  constructor(generator) {
    // Construct.
    super()

    // Set the default.
    this
      .set("auth_name", "oauth")
      .set("generator", generator)
      .set("users", user(generator.request("host").get("env")))
  }

  /**
   * Register any plugins on the server, called by
   * the server plugin.
   * @param  {Function} generator that instantiates this plugin.
   * @return {Multicolour_Auth_OAuth} Object for chaining.
   */
  register() {
    // Get the generator calling this plugin.
    const generator = this.get("generator")

    // Get the host and server.
    const host = generator.request("host")
    const server = generator.request("raw")

    // Get the config.
    const config = host.get("config").get("auth")

    // Register the user model with the hosting Multicolour's Waterline instance.
    host.request("waterline").loadCollection(this.get("users"))

    // Register the JWT plugin.
    server.register([require("bell"), require("hapi-auth-cookie")], error => {
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
      server.auth.strategy("session", "cookie", {
        password: config.password,
        cookie: "suid",
        redirectTo: "/session",
        redirectOnTry: false,
        isSecure: config.hasOwnProperty("isSecure") ? config.isSecure : true
      })
    })

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

    // Get the user model.
    const users = host.get("database").get("models").user

    // If it's not an authorised request, exit.
    if (!request.auth.isAuthenticated || !profile) {
      return reply(Boom.unauthorized(request.auth.error.message)).code(403)
    }

    // Clear any current session.
    request.auth.session.clear()

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
            reply(Boom.create(500, err.message, err))
          }
          else {
            // Set the session details.
            request.auth.session.set(found_user)

            // Go to the user.
            reply.redirect(config.register_password_redirect_path || `/user/${created_user.id}`).code(202)
          }
        })
      }
      else {
        // Set the session details.
        request.auth.session.set(found_user)

        // Redirect.
        reply.redirect(config.success_redirect_path || `/user/${found_user.id}`)
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
    // Clear the session.
    request.auth.session.clear()

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

// Export the required config for Multicolour
// to register and handle.
module.exports = {
  // It's an auth plugin.
  type: require("multicolour/lib/consts").AUTH_PLUGIN,

  // The generator is the class above.
  plugin: Multicolour_Auth_OAuth
}
