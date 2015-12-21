"use strict"

// Get the testing library.
const tape = require("tape")

// Get our plugin.
const plugin = require("../index")

// Get Multicolour.
const multicolour = new (require("multicolour"))({
  content: "./tests/test_content/",
  auth: {
    isSecure: true,
    providers: new Set([
      {
        provider: "twitter",
        clientId: "brugwhbiguw",
        clientSecret: "brugwhbiguw",
        isSecure: false
      }
    ])
  },
  db: {
    adapters: {
      development: require("sails-memory")
    },
    connections: {
      development: {
        adapter: "development",
        host: "localhost",
        port: 27017,
        database: "multicolour"
      }
    }
  }
}).scan()

const Test_Server_Plugin = require("./test_content/server")
multicolour.use(Test_Server_Plugin)

// Used in our tests.
const request = {
  headers: {
    authorization: "Bearer whatever"
  },
  auth: {
    isAuthenticated: false,
    error: {
      message: ""
    },
    credentials: {
      user: {
        id: 1
      },
      profile: {
        raw: {
          profile_image_url: ""
        }
      }
    },
    session: {
      clear: () => this
    }
  },
  url: {
    query: {
      oauth_token: ""
    }
  }
}
const reply = () => { return { code: () => this } }
reply.test = () => {}
reply.continue = () => {}

tape("Can register the plugin", test => {
  // Some stupid tests for sanity.
  test.ok(multicolour.get("server"), "Stupid test, make sure test server is registered.")

  // Onto our real tests.
  test.ok(multicolour.get("server").use(plugin), "Registers auth plugin without error.")

  // Test another branch where isSecure is missing and defaulted.
  delete multicolour.get("config").get("auth").isSecure
  test.ok(multicolour.get("server").use(plugin), "Registers auth plugin without error with default isSecure value.")

  // Exit.
  test.end()
})

tape("Handlers is as expected", test => {
  const handlers = multicolour.get("server").request("auth_plugin").handlers()
  multicolour.get("database").start(() => {
    test.ok(handlers.has("create"), "Has a session creation function")
    test.ok(handlers.has("destroy"), "Has a session destruction function")

    test.ok(handlers.get("create")(request, reply), "Creation works as expected and 'replies' with a boom error.")

    request.auth.isAuthenticated = true

    test.ok(handlers.get("create")(request, reply), "Creation works as expected and continues past error.")
    test.ok(handlers.get("destroy")(request, reply), "Destroy works as expected.")

    test.end()
  })
})
