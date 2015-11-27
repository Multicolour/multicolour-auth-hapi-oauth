"use strict"

module.exports = connection => {
  // Get our tools.
  const waterline = require("waterline")

  const constraint = {
    user: "auth.credentials.id"
  }

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
      provider: {
        type: "string",
        required: true
      },
      user: {
        model: "user"
      }
    },

    constraints: {
      post: constraint,
      patch: constraint,
      put: constraint,
      delete: constraint
    }
  })

  return model
}
