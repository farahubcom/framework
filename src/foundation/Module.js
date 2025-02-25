const omit = require("lodash/omit");
const forOwn = require("lodash/forOwn");

class Module {

    /**
     * The module application
     *
     * @var Application
     */
    app;

    /**
     * The module name
     *
     * @var string
     */
    name;

    /**
     * The module version
     *
     * @var string
     */
    version;

    /**
     * The module base path
     *
     * @var string
     */
    basePath;

    /**
     * All of the module models
     *
     * @var Object
     */
    models = {};

    /**
     * All of the module schemas
     *
     * @var Object
     */
    schemas = {};

    /**
     * All of the module controllers
     *
     * @var array
     */
    controllers = [];

    /**
     * The module injections
     * 
     * @var array
     */
    injections = {};

    /**
     * All of the module sockets
     *
     * @var array
     */
    sockets = [];

    /**
     * All of the module listeners
     *
     * @var Map
     */
    listeners = new Map();

    /**
     * All of the module conditions
     *
     * @var array
     */
    conditions = [];

    /**
     * All of the module triggers
     *
     * @var array
     */
    triggers = [];

    /**
     * All of the module jobs
     *
     * @var array
     */
    jobs = [];

    /**
     * Create the module instance
     *
     * @param Application app
     * @return void
     */
    constructor(app) {
        this.app = app;
    }

    /**
     * Boot the module
     *
     * @var array
     */
    boot() {
        //
    }

    /**
     * Register the module injections
     * 
     * @return void
     */
    registerInjections(injections) {
        const self = this;
        forOwn(injections, (value, key) => {
            self.injections = {
                ...self.injections,
                [key]: [...(self.injections[key] || []), value]
            }
        })
    }

    /**
     * Inject a function in specific place of module
     * 
     * @param {String} hookName hook name
     * @param {Object} args extra arguments
     * @returns Function
     */
    async inject(hookName, args) {
        if (
            Object.keys(this.injections).map(
                hook => String(hook).toLowerCase() === String(hookName).toLowerCase()
            ).filter(Boolean).length < 1
        ) return null;

        return await Promise.all(
            this.injections[hookName].map(
                async (render, index) => await render({ ...args, key: index })
            )
        );
    }

    /**
     * Register the module controllers
     * 
     * @param Controller[]
     * @return void
     */
    registerControllers(controllers) {
        controllers.forEach(Controller => {
            const controller = new Controller(this);
            // controller.registerRouters();
            this.controllers = [...this.controllers, controller]
        })
    }

    /**
     * Register the module sockets
     * 
     * @param Socket[]
     * @return void
     */
    registerSockets(sockets) {
        this.sockets = sockets;
    }

    /**
     * Register the module listeners
     * 
     * @param Listener[]
     * @return void
     */
    registerListeners(listeners) {
        listeners.forEach((listenersList, event) => {
            let registeredListeners = [];
            listenersList.forEach(Listener => {
                registeredListeners = [...registeredListeners, new Listener(this.app)];
            })
            this.listeners.set(event, registeredListeners);
        })
    }

    /**
     * Register the module models
     * 
     * @param Model[]
     * @return void
     */
    registerModels(models) {
        const self = this;
        forOwn(models, (Model, key) => {
            Model.app = self.app;
            self.models[key] = Model;
        });
    }

    /**
     * Register the module schemas
     * 
     * @param {Object} Schema schemas
     * @return void
     */
    registerSchemas(schemas) {
        const self = this;

        forOwn(omit(schemas, 'injects'), (schema, schemaName) => {
            if (!self.models[schemaName])
                throw new Error(`Model ${schemaName} not exist`);
            schema.loadClass(self.models[schemaName]);
            self.schemas[schemaName] = schema;
        });

        // register inject schemas
        if ('injects' in schemas) {
            forOwn(schemas['injects'], (moduleSchemas, moduleName) => {
                forOwn(moduleSchemas, (schema, schemaName) => {
                    if (!self.models[schemaName])
                        throw new Error(`Model ${schemaName} not exist`);
                    schema.loadClass(self.models[schemaName]);
                    self.schemas = {
                        ...self.schemas,
                        injects: {
                            ...self.schemas.injects,
                            [moduleName]: {
                                ...self.schemas.injects?.moduleName,
                                [schemaName]: schema
                            }
                        }
                    }
                })
            })
        }
    }

    // /**
    //  * Register the module conditions
    //  * 
    //  * @param Condition[]
    //  * @return void
    //  */
    // registerConditions(conditions) {
    //     conditions.forEach(Condition => {
    //         this.conditions = [...this.conditions, new Condition()];
    //     });
    // }

    // /**
    //  * Register the module triggers
    //  * 
    //  * @param Trigger[]
    //  * @return void
    //  */
    // registerTriggers(triggers) {
    //     triggers.forEach(Trigger => {
    //         this.triggers = [...this.triggers, new Trigger()];
    //     });
    // }

    /**
     * Get the module specific controller
     *
     * @param string controllerName
     * @return Controller
     */
    controller(controllerName) {
        return this.controllers.filter(
            controller => String(controller.name).toLowerCase() === String(controllerName).toLowerCase()
        )[0]
    }
}

module.exports = Module;