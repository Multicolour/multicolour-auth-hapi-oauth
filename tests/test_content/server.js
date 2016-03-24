"use strict"

class headers {
  set() {}
  get() {
    return {
      accept: "application/json"
    }
  }
}

class Test_Server_Plugin extends Map {
  constructor() {
    super()

    this
      .reply("server", {})
      .reply("raw", {
        register: (what, callback) => callback(),
        route: () => {},
        auth: {
          strategy: () => {},
          default: () => {}
        }
      })
  }

  register(multicolour) {
    multicolour
      .reply("header_validator", new headers())
      .reply("decorator", "test")
      .set("server", this)
  }

  use(plugin_conf) {
    const new_plugin = new plugin_conf(this)

    new_plugin.register(this)
    this.reply("auth_plugin", new_plugin)
    return this
  }

  start() { return this }
  stop() { return this }
}

module.exports = Test_Server_Plugin
