"use strict"

// Get the testing library.
const tape = require("tape")

// Get Multicolour.
const multicolour = require("multicolour")
  .new_from_config_file_path("./tests/test_content/config")
  .scan()

// Register the hapi server.
multicolour.use(require("multicolour-server-hapi"))

// Register the plugin we're testing.
multicolour.get("server").use(require("../index"))


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
