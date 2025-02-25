const join = require("lodash/join");
const camelCase = require("lodash/camelCase");

class Event {

    /**
     * Format event name
     */
    static withFormat(module, event) {
        return join([
            camelCase(module.name),
            camelCase(event.constructor.name)
        ], ":")
    }

    /**
     * Register events for specific module
     * 
     * @param {Module} module the module instance
     * @param {{ withFormat: func }} 
     */
    static register(module, { withFormat = undefined } = {}) {
        return async (req, res, next) => {
            try {
                req.event = event => module.app.emit((withFormat || this.withFormat)(module, event), event);
                next();
            } catch (error) {
                next(error);
            }
        }
    }
}

module.exports = Event;