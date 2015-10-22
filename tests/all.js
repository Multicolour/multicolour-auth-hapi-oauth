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
        password: "nwc",
        provider: "nwc"
      }
    ])
  }
}).scan()

// Get the plugin we're testing.
const Test_Server_Plugin = require("./test_content/server")

// Fluff some stuff the test environment won't automagically do for us.
multicolour.extend(Test_Server_Plugin)
Test_Server_Plugin.reply("host", multicolour)

// Used in our tests.
const request = {
  auth: {
    isAuthenticated: false,
    error: {
      message: ""
    },
    credentials: {},
    session: {
      clear: () => this
    }
  }
}
const reply = () => { return { code: () => this } }
reply.continue = () => this

tape("Can register the plugin", test => {
  // Some stupid tests for sanity.
  test.ok(multicolour.use(Test_Server_Plugin), "Stupid test, make sure test server plugin is okay.")
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

  test.ok(handlers.has("create"), "Has a session creation function")
  test.ok(handlers.has("destroy"), "Has a session destruction function")

  test.ok(handlers.get("create")(request, reply), "Creation works as expected and 'replies' with a boom error.")

  request.auth.isAuthenticated = true
  request.auth.credentials = true

  test.ok(handlers.get("create")(request, reply), "Creation works as expected and continues past error.")
  test.ok(handlers.get("destroy")(request, reply), "Destroy works as expected.")

  test.end()
})
