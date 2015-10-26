"use strict"

/**
 * Generate a secure string using the Diffie Hellman algorithm.
 *
 * @link https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange
 * @param  {Number} prime_length to generate to.
 * @return {String} salt to use to secure a password.
 */
const create_salt = prime_length =>
  require("crypto")
    .createDiffieHellman(prime_length || 500, "base64")
    .generateKeys("base64")


// Export the tools.
module.exports.create_salt = create_salt
