"use strict"

// Default user properties. Cannot override.
const user_defaults = {
  requires_email: true,
  requires_password: true,
  role: "user"
}

// Get some tools.
const extend = require("util")._extend

class Session_Manager {
  /**
   * Set our host and get our models.
   * @param  {Multicolour} multicolour instance running this.
   * @return {void}
   */
  constructor(multicolour) {
    // Set the host.
    this.__host = multicolour

    // Get the models.
    this.__models = multicolour.get("database").get("models")
  }

  /**
   * Find or create a user by their username.
   * @param  {String}   username to search for.
   * @param  {String}   name of the user, used in creation.
   * @param  {Function} callback to execute when done.
   * @return {void}
   */
  findUserOrCreate(user_object, callback) {
    // Shorten the call to this.
    const users = this.__models.user

    // Create the defaults.
    const writable_user = extend(user_object, user_defaults)

    // Try to find the user in the database.
    users.findOne({ username: user_object.username }, (err, user) => {
      // Check for errors.
      if (err) {
        callback(err, null)
      }
      // Did we find the user?
      else if (!user) {
        // Register the user.
        users.create(writable_user, (err, user) => {
          // Check for errors.
          if (err) {
            callback(err, null)
          }
          else {
            callback(null, user)
          }
        })
      }
      // Check the user is active.
      else if (user.status === "inactive") {
        callback(new Error("User found but inactive"), null)
      }
      // Found the user, call home.
      else {
        callback(null, user)
      }
    })
  }

  /**
   * Find a session by it's token or create one.
   * @param  {String}   token to find or create.
   * @param  {Number}   user to match.
   * @param  {Function} callback to execute when finished.
   * @return {void}
   */
  findSessionOrCreate(session_object, user, callback) {
    // Shorten the call to this.
    const sessions = this.__models.session

    // Try to find the session.
    sessions
      .findOne({ user: user.id })
      .populate("user")
      .exec((err, session) => {
        // Check for errors.
        if (err) {
          callback(err, null)
        }
        // Did we find a session?
        else if (!session) {
          // Generate a new token for the session.
          session_object.token = this.__host.request("new_uuid")

          // Create the session.
          sessions.create(session_object, (err, session) => {
            // Check for errors.
            if (err) {
              callback(err, null)
            }
            else {
              // Find the new session and get the user.
              sessions
                .findOne(session)
                .populate("user")
                .exec((err, session) => {
                  if (err) {
                    callback(err, null)
                  }
                  else {
                    callback(null, session)
                  }
                })
            }
          })
        }
        else {
          callback(null, session)
        }
      })
  }
}

module.exports = Session_Manager
