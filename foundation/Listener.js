class Listener {

    /**
     * The application instance
     * 
     * @var Application
     */
    app;

    /**
     * Register the listener instance
     *
     * @var array
     */
    constructor(app) {
        this.app = app;
    }
}

module.exports = Listener;