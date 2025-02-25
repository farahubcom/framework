class Condition {

    /**
     * Name of the condition
     * 
     * @var string
     */
    name;

    /**
     * Identifier of the condition
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
     * Create the condition instance
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

module.exports = Condition;