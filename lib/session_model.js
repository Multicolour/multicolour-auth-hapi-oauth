"use strict"

module.exports = connection => {
  // Get our tools.
  const waterline = require("waterline")

  const model = waterline.Collection.extend({
    // Name of the table.
    identity: "session",

    // Never auto-migrate the users,
    // that might delete details.
    migrate: "safe",

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
    }
  })

  return model
}
