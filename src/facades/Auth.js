const passport = require("passport");


class Auth {

    /**
     * Authenticate user middleware
     * 
     * @return {func}
     */
    static authenticate(strategy, options) {
        return passport.authenticate(strategy, options);
    }
}

module.exports = Auth;