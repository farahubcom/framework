const camelCase = require("lodash/camelCase");

class Socket {

    /**
     * The socket application
     * 
     * @var Application
     */
    app;

    /**
     * The socket module
     * 
     * @var Module
     */
    module;

    /**
     * The socket name
     * 
     * @var string
     */
    name;

    /**
     * The socket events
     * 
     * @var array
     */
    events = [];

    /**
     * Create the module instance
     *
     * @var array
     */
    constructor(module) {
        this.module = module;
        this.app = module.app;
    }

    /**
     * Format event name
     */
    withFormat(eventName) {
        return [
            camelCase(this.module.name),
            camelCase(eventName)
        ].join(':')
    }

    /**
     * Register the sockets
     *
     * @return void
     */
    register(socket) {
        this.events.forEach(
            (event) => {
                if (!this[event.handler]) {
                    throw new Error(`Handler '${event.handler}' not found at module '${this.module.name}.${this.name}'`);
                }

                socket.on(
                    event.event || this.withFormat(event.name),
                    ((this[event.handler].bind(this))(socket)).bind(this)
                );
            }
        );
    }
}

module.exports = Socket;