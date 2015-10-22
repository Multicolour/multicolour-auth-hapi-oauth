"use strict"

class Test_Server_Plugin extends Map {
  constructor() {
    super()

    this
      .reply("server", {})
      .reply("raw", {
        register: (what, callback) => callback(),
        auth: {
          strategy: () => {}
        }
      })
  }

  use(plugin_conf) {
    const new_plugin = new plugin_conf.plugin(this)

    new_plugin.register()
    this.reply("auth_plugin", new_plugin)
    return this
  }

  warn() { return this }

  start() { return this }

  stop() { return this }
}

module.exports = {
  type: require("multicolour/lib/consts").SERVER_GENERATOR,
  generator: Test_Server_Plugin
}
