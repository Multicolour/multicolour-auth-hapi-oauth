"use strict"

// Limit writes to the user.
const constraint = { user: "auth.credentials.user.id" }

module.exports = {
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
      model: "multicolour_user"
    },
  },

  // Constrain write operations to the session owner.
  constraints: {
    get: constraint,
    patch: constraint,
    put: constraint,
    delete: constraint
  },

  NO_AUTO_GEN_ROUTES: true,
  NO_AUTO_GEN_FRONTEND: true
}
