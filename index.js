"use strict"

const Boom = require("boom")

class Multicolour_Auth_OAuth extends Map {

  constructor(generator) {
    // Construct.
    super()

    // Set the default.
    this
      .set("auth_name", "oauth")
      .set("generator", generator)
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

    // Register the JWT plugin.
    server.register([require("bell"), require("hapi-auth-cookie")], error => {
      // Check for errors.
      if (error) {
        throw error
      }

      // Register the auth strategy.
      server.auth.strategy(config.provider, "bell", config)

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

  create(request, reply) {
    // Get the profile from the request.
    const profile = request.auth.credentials

    console.log(profile)

    if (!request.auth.isAuthenticated) {
      return reply(Boom.unauthorized(request.auth.error.message))
    }

    // Set the session.
    request.auth.session.clear()

    if (profile) {
      request.auth.session.set(profile)
    }

    // Keep going.
    reply.continue()
  }

  destroy(request, reply) {
    // Clear the session.
    request.auth.session.clear()

    // Keep on swimming, keep on swimming.
    reply.continue()
  }

  handlers() {
    return new Map([
      ["create", this.create.bind(this)],
      ["destroy", this.destroy.bind(this)]
    ])
  }
}

// Export the required config for Multicolour
// to register and handle.
module.exports = host => {
  return {
    // It's an auth plugin.
    type: host.get("types").AUTH_PLUGIN,

    // The generator is the class above.
    plugin: Multicolour_Auth_OAuth
  }
}
