"use strict"

module.exports = {
  // Where is your content? blueprints, etc
  content: `${__dirname}/`,

  // Are you developing? true or false
  debug: process.env.NODE_ENV !== "production",

  // Configure our servers, api and frontend.
  http: {
    // Configures the REST server.
    api: {
      host: "localhost",
      port: 1811,
      routes: { cors: true },
      router: { stripTrailingSlash: true }
    }
  },

  // Set up our desired database adapter (defaults to Mongo)
  db: {
    adapters: {
      development: require("sails-memory")
    },
    connections: {
      development: {
        adapter: "production",
        host: "localhost",
        port: 27017,
        database: "multicolour"
      }
    }
  }
}
