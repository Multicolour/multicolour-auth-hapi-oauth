"use strict"

module.exports = connection => {
  // Get our tools.
  const waterline = require("waterline")

  // Limit writes to the user.
  const constraint = { user: "auth.credentials.id" }
  const create_constraint = { user: (params, payload, auth) => auth.credentials.roles === "consumer" }

  const model = waterline.Collection.extend({
    // Name of the table.
    identity: "session",

    // The connection to CRUD users to and from.
    connection,

    // Session's details.
    attributes: {
      token: {
        type: "string",
        required: true,
        unique: true
      },
      verifier: "string",
      provider: "string",
      user: {
        model: "user"
      },

      /**
       * By default, we don't want any NULL
       * or undefined values in our response.
       * @return {Object} without any undefined or null values.
       */
      toJSON() {
        // Get the object.
        const model = this.toObject()

        // Remove any NULL/undefined values.
        Object.keys(model).forEach(key => {
          if (model[key] === null || typeof model[key] === "undefined") {
            delete model[key]
          }
        })

        // Return the modified object.
        return model
      }
    },

    associations: [{
      alias: "user"
    }],

    constraints: {
      post: create_constraint,
      patch: constraint,
      put: constraint,
      delete: constraint
    }
  })

  return model
}
