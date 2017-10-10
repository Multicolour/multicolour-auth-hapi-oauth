"use strict"

// Get the testing library.
const tape = require("tape")

// Get Multicolour.
const multicolour = require("multicolour").new_from_config_file_path("./tests/test_content/config").scan()

// Register the hapi server.
multicolour.use(require("multicolour-server-hapi"))

// Register the plugin we're testing.
multicolour.get("server").use(require("../index"))

// Start the tests once the database has "started"
multicolour.get("database").start().then(() => {
  // Get the raw server.
  const server = multicolour.get("server").request("raw")
  const models = multicolour.get("database").get("models")

  multicolour.get("server").generate_routes()
  multicolour.trigger("server_starting")

  tape("Units", test => {
    test.plan(6)
    server.inject({
      url: "/session",
      headers: {
        accept: "application/json"
      }
    }, response => {
      test.equal(response.statusCode, 401, "Request without authorization is 401")
    })

    models.session.create({token: "1234", user: "100"}).exec(() => {
      server.inject({
        url: "/session",
        headers: {
          accept: "application/json",
          authorization: "Bearer 1234"
        }
      }, response => {
        test.equal(response.statusCode, 401, "Response is 401 with invalid session user.")
      })
    })

    models.session.create({token: "12345", user: "1"}).exec(() => {
      models.multicolour_user.create({username: "multicolour", name: "Multicolour"}).exec(() => {
        server.inject({
          url: "/session",
          headers: {
            accept: "application/json",
            authorization: "Bearer 12345"
          }
        }, response => test.equal(response.statusCode, 200, "Response is 200 with valid session user."))

        server.inject({
          url: "/session",
          headers: {
            accept: "application/json",
            authorization: "12345"
          }
        }, response => test.equal(response.statusCode, 400, "Response is 400 with missing 'Bearer' in authorization header."))

        server.inject({
          url: "/session",
          headers: {
            accept: "application/json",
            authorization: "HELLO 12345"
          }
        }, response => test.equal(response.statusCode, 401, "Response is 401 with an invalid authorization header prefix."))

        server.inject({
          url: "/session",
          headers: {
            accept: "application/json",
            authorization: "Bearer 456789"
          }
        }, response => test.equal(response.statusCode, 401, "Response is 401 with an invalid session token."))
      })
    })
  })
})
