"use strict"

function hash_password(values, next) {
  if (!values.password) {
    return next()
  }

  const utils = require("./util")

  // Get the crypto library.
  const crypto = require("crypto")

  // These should be a *slow* as possible, higher = slower.
  // Slow it down until you tweak a bounce change.
  const prime_length = process.env.SALT_GEN_PRIME_LENGTH || 400
  const password_iterations = process.env.PW_GEN_PW_ITERS || 4096

  // Password length and algorithm.
  const password_length = process.env.PW_GEN_PW_LENGTH || 512
  const password_algorithm = process.env.PW_GEN_PW_ALG || "sha256"

  // Create a salt for this user.
  const salt = utils.create_salt(prime_length)

  // Create a hash, we're going to encrypt the password.
  // I wish Node had native support for good KDF functions
  // like brypt or scrypt but PBKDF2 is good for now.
  crypto.pbkdf2(values.password, salt, password_iterations, password_length, password_algorithm, (err, key) => {
    // Apply the hash and salt to the inbound values.
    values.password = key.toString("hex")
    values.salt = salt

    // Move on.
    next()
  })
}

module.exports = connection => {
  // Get our tools.
  const waterline = require("waterline")
  const utils = require("./util")

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
    beforeUpdate: hash_password
  })

  return model
}
