const express = require('express');


class Controller {

    /**
     * The controller application
     * 
     * @var Application
     */
    app;

    /**
     * The controller module
     * 
     * @var Module
     */
    module;

    /**
     * The controller name
     * 
     * @var string
     */
    name;

    /**
     * The controller base path
     * 
     * @var string
     */
    basePath;

    /**
     * The controller routes
     * 
     * @var array
     */
    routes = [];

    /**
     * The controller routers
     * 
     * @var string
     */
    routers = {};

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
     * Register the controller routers
     *
     * @return void
     */
    registerRouters(socket) {
        this.routes.forEach(
            (route) => {
                if (!this[route.handler]) {
                    throw new Error(`Handler '${route.handler}' not found at middleware '${this.module.name}.${this.name}'`);
                }

                const type = String(route.type).toLowerCase();
                const method = String(route.method).toLowerCase();
                const path = [this.module.basePath, this.basePath, route.path].filter(Boolean).join('');
                const handler = (this[route.handler].bind(this))(socket);
                const responses = [typeof handler == "function" ? handler.bind(this) : handler.map(h => h.bind(this))]
                const middlewares = route.middleware ? [typeof route.middleware == "function" ? route.middleware : route.middleware] : []

                if (!this.routers[type])
                    this.routers[type] = express.Router();

                this.routers[type][method](path, ...[...middlewares, ...responses]);
            }
        );
    }
}

module.exports = Controller;