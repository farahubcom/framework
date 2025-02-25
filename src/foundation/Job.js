class Job {

    /**
     * The job identifier
     * 
     * @var string
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
     * @var Workspace
     */
    workspace;

    /**
     * The connection instance
     * 
     * @var Connection
     */
    connection;

    /**
     * Register the Job instance
     *
     * @var array
     */
    constructor(app, workspace) {
        this.app = app;
        this.workspace = workspace;
    }

    /**
     * Prepare the job
     */
    async prepare() {
        this.connection = await this.workspace.getOrCreateConnection(this.app);
        return this;
    }

    /**
     * The job interval
     * 
     * @return string|number
     */
    interval() {
        //
    }

    /**
     * Handle job
     */
    handle(data) {
        //
    }
}

module.exports = Job;