class Trigger {

    /**
     * Name of the trigger
     * 
     * @var string
     */
    name;

    /**
     * Identifier of the trigger
     * 
     * @var array
     */
    identifier;

    /**
     * The application instance
     * 
     * @var Application
     */
    app;

    /**
     * The workspace instance
     * 
     * @var Module
     */
    workspace;

    /**
     * Workspace connection instance
     * 
     * @var string
     */
    connection;

    /**
     * Create the trigger instance
     *
     * @param {Application} app
     * @param {Workspace} workspace
     * @param {Connection} connection
     */
    constructor(app, workspace, connection) {
        this.app = app;
        this.workspace = workspace;
        this.connection = connection;
    }
}

module.exports = Trigger;