"use strict"

/**
 * Hash a plain text password using PBKDF2 and SHA256.
 * @param  {Object}   values to be written to the database.
 * @param  {Function} next callback, used to finish the operation.
 * @return {void}
 */
function hash_password(values, next) {
  // If no password was provided, just move on and exit.
  if (!values.password) {
    return next()
  }

  // Get out utility-belt.
  const utils = require("./util")

  // Create a salt for this user.
  const salt = utils.create_salt()

  // We're going to encrypt the password.
  utils.hash_password(values.password, salt, (password, salt) => {
    // Apply the hash and salt to the inbound values.
    values.password = password.toString("hex")
    values.salt = salt

    // Move on.
    next()
  })
}

module.exports = connection => {
  // Get our tools.
  const waterline = require("waterline")

  const model = waterline.Collection.extend({
    // Name of the table.
    identity: "user",

    // Never auto-migrate the users,
    // that might delete details.
    migrate: "safe",

    // The connection to CRUD users to and from.
    connection,

    // User's details.
    attributes: {
      username: {
        type: "string",
        required: true,
        unique: true
      },
      email: {
        type: "string",
        email: true,
        unique: true
      },
      name: {
        required: true,
        type: "string"
      },
      password: "string",
      source: "string",
      profile_image_url: {
        type: "string",
        url: true
      },
      requires_password: {
        type: "boolean",
        defaultsTo: true,
        required: true
      },
      requires_email: {
        type: "boolean",
        defaultsTo: true,
        required: true
      }
    },

    // Before we create anything, make sure
    // to hash the password for security.
    beforeCreate: hash_password,
    beforeUpdate: hash_password,

    toJSON: () => {
      const model = this.toObject()
      delete model.password
      delete model.salt

      return model
    }
  })

  return model
}
