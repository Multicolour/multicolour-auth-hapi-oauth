"use strict"

module.exports = {
  // Where is your content? blueprints, etc
  content: __dirname,

  auth: {
    password: "12owgwnoirgjnowrgjnwpiorgjwpgrjp2wpo34",
    providers: [
      {
        provider: "twitter",
        clientId: "brugwhbiguw",
        clientSecret: "brugwhbiguw",
        isSecure: false
      }
    ]
  },

  // Configure the Hapi server.
  // These objects are passed directly to Hapi
  // and are not abstracted at all, all config
  // available to Hapi are available to Multicolour.
  api_connections: {
    port: 1811,
    host: "localhost",
    routes: {
      cors: {
        // You should update this to reflect only
        // the domains you wish to allow access to
        // the API being generated.
        origin: [ "localhost:1811" ]
      }
    },
    router: { stripTrailingSlash: true }
  },

  api_server: {
    connections: {
      routes: {
        security: true
      }
    },
    debug: { request: ["error"] }
  },

  db: {
    adapters: {
      memory: require("sails-memory")
    },
    connections: {
      development: {
        adapter: "memory"
      }
    }
  }
}
