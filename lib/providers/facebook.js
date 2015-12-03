"use strict"

class Facebook {
  /**
   * Create the payload for a new user with
   * the response from this service provider.
   * @param  {Hapi.Request} request made.
   * @return {Object} User object for inserting to data layer.
   */
  static create_user_payload(request) {
    // Get the profile from the request.
    const profile = request.auth.credentials

    console.log(profile)

    // Return the object we need.
    return {
      username: profile.profile.username,
      name: profile.profile.displayName,
      source: "facebook",
      profile_image_url: profile.profile.raw.profile_image_url.replace(/_normal/, ""),
      requires_password: true,
      requires_email: true,
      role: "user"
    }
  }

  /**
   * Verify a token with Github's API.
   * @param  {Hapi.Request} req made.
   * @param  {Hapi.Response} reply interface.
   * @return {void}
   */
  static verify_token(req, config, callback) {

  }

}

module.exports = Facebook
