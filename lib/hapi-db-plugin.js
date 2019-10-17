"use strict"

// Get our tools.
const Boom = require("@hapi/boom")

/**
 * The actual implementation of the auth mechanism.
 * @param  {Server}   server to register plugin to.
 * @param  {Object}   options passed in during registration.
 * @return {void}
 */
function auth_implementation(server, options) {
  // Check we got a host.
  if (!options.host) {
    /* istanbul ignore next : Untestable */
    throw new TypeError("Host not in the options. Please pass an instance of Multicolour.")
  }

  return {
    authenticate: (request, reply) => {
      // Get the request.
      const req = request.raw.req

      // Get the Authorization header.
      const authorization = req.headers.authorization

      const session_model = options.host.get("database").get("models").session

      // Check we have a header first.
      if (!authorization) {
        return reply(Boom.unauthorized(null, "session_store"))
      }

      // Split the authentication apart between Bearer and token.
      const parts = authorization.split(/\s+/)

      // Check the format.
      if (parts.length !== 2) {
        return reply(Boom.badRequest("Bad HTTP authentication header format", "Bearer"))
      }
      else if (parts[0].toLowerCase() !== "bearer") {
        return reply(Boom.unauthorized("Bad HTTP authentication header format. Missing `Bearer `", "Bearer"))
      }

      // If we got here, check the database for the login details.
      return session_model
        .findOne({token: parts[1].toString()})
        .populateAll()
        .then(model => {
        // Check for errors.
          if (!model) {
            throw Boom.unauthorized("Not authorised to perform this action.", "session_store")
          }
          // Was a valid user found?
          else if (!model.user) {
            throw Boom.unauthorized("Session exists without valid `multicolour_user`", "session_store")
          }
          // Success, continue with the request.
          else {
          // Add the user's role to the scope for this request.
            model.scope = model.user.role

            // Move onto the handler.
            reply.continue({ credentials: model })
          }
        })
        .catch(err => {
          throw err
        })
    }
  }
}

/**
 * Register the plugin to HapiJS.
 * @param  {Server}   server to register plugin to.
 * @param  {Object}   options passed in during registration.
 * @param  {Function} next callback to finish registration.
 * @return {void}
 */
const register = (server) => {
  server.auth.scheme("session_store", auth_implementation)
}

// Export the config for Hapi to read.
const attributes = {
  pkg: require("../package.json")
}

// Export all the things.
module.exports.name = "hapi-db-plugin"
module.exports.register = register
module.exports.register.attributes = attributes
