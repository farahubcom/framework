const forOwn = require("lodash/forOwn");
const pick = require("lodash/pick");
const mongoose = require("mongoose");
const express = require("express");
const cors = require('cors');
const http = require('http');
const https = require('https');
const { Server: IOServer } = require("socket.io");
const subdomain = require('express-subdomain');
const path = require('path');
const device = require('express-device');
const bodyParser = require('body-parser');
const omit = require("lodash/omit");
const events = require("events");
const camelCase = require("lodash/camelCase");
const fs = require("fs");
const vhost = require('vhost');
const { default: asyncMiddleware } = require("middleware-async");
const WorkspaceFacade = require('../modules/core/facades/Workspace');
const { Agenda } = require('@hokify/agenda');
const { I18n } = require('i18n');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
// const next = require('next');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require("passport");
const referrerPolicy = require('referrer-policy');
const View = require("../facades/View");


const { EventEmitter } = events;

class Application extends EventEmitter {

     /**
      * The application hostName
      *
      * @var string
      */
     hostname;

     /**
      * application is in development env
      *
      * @var string
      */
     dev;

     /**
      * The application database connection
      *
      * @var string
      */
     connection;

     /**
      * The application active connections
      *
      * @var Object
      */
     connections = {};

     /**
      * All of the registered modules
      *
      * @var Module[]
      */
     modules = [];

     /**
      * application core modules
      *
      * @var string[]
      */
     coreModules = [];

     /**
      * application default modules
      *
      * @var string[]
      */
     defaultModules = [];

     /**
      * register application server
      *
      * @var Object
      */
     server;

     /**
      * register application socket io
      *
      * @var Object
      */
     io;

     // /**
     //  * register application agenda instance
     //  *
     //  * @var Object
     //  */
     // agenda;

     /**
      * resolve application root path
      *
      * @var string
      */
     rootPath = path.join(__dirname, '..');

     /**
      * resolve application path
      *
      * @var string
      */
     appsPath = path.join(__dirname, '../apps');

     /**
      * resolve application path
      *
      * @var string
      */
     modulesPath = path.join(__dirname, '../modules');

     /**
      * make the application instance
      *
      * @param config Object
      * @return void
      */
     make(config) {

          const self = this;

          Object.assign(this, pick(config, [
               'hostname',
               'dev',
               'coreModules',
               'defaultModules'
          ]));

          config.modules.forEach(Module => {
               this.registerModule(Module);
          });

          self.registerHooks();

          self.registerCoreDatabase();
          self.registerCoreModels();

          self.registerServer();
          self.registerWorkspacesRouters();

          self.registerListeners();

          self.modules.map(module => module.boot());

          self.on('core:workspaces:modified', function (workspaceId) {
               // delete self.connections[workspaceId];
               self.registerWorkspacesRouters();
          });
     }

     /**
      * Get application core connection string
      * 
      * @returns {string}
      */
     getCoreConnectionString() {
          return 'mongodb://127.0.0.1:27017/'.concat(process.env.CORE_DB_NAME)
     }

     /**
     * Register the application module
     *
     * @return void
     */
     registerModule(Module) {
          const module = new Module(this);
          module.register();
          this.modules = [...this.modules, module]
     }

     /**
     * Register the application base db
     *
     * @return void
     */
     registerCoreDatabase() {
          this.connection = mongoose.createConnection(
               this.getCoreConnectionString()
          );
     }

     /**
     * Register the application base models
     *
     * @return void
     */
     registerCoreModels() {
          let schemas = {};
          const coreModules = this.modules.filter(module => this.coreModules.includes(module.name));

          coreModules.forEach(module => {
               forOwn(omit(module.schemas, 'injects'), (schema, schemaName) => {
                    if (schemaName in schemas) {
                         schemas[schemaName].add(schema);
                    } else {
                         schemas[schemaName] = schema;
                    }
               })
          });

          // register injected schemas
          coreModules.forEach(module => {
               if ('injects' in module.schemas) {
                    forOwn(module.schemas['injects'], (moduleSchemas) => {
                         forOwn(moduleSchemas, (schema, schemaName) => {
                              if (schemaName in schemas) {
                                   schemas[schemaName].add(schema);
                              }
                         })
                    })
               }
          });

          // add schemas from rest of modules
          this.modules.filter(module => !this.coreModules.includes(module.name))
               .forEach((module) => {
                    forOwn(module.schemas, (value, key) => {
                         if (key in schemas) {
                              schemas[key].add(value);
                         }
                    })
               });

          forOwn(schemas, (value, key) => {
               this.connection.model(key, value);
          });
     }

     /**
      * Resolve all modules routers
      * 
      * @return {Object} resolved routers
      */
     getRouters() {
          const routers = {};

          this.modules.forEach((module) => {
               module.controllers.forEach(controller => {
                    // register routers with socket
                    controller.registerRouters();

                    Object.keys(controller.routers).forEach(key => {
                         if (!routers[key])
                              routers[key] = express.Router();

                         routers[key].use('/', controller.routers[key]);
                    });
               });
          });

          // register global api not found error
          routers['api'].use(function (req, res) {
               res.status(404);

               if (req.accepts('json')) {
                    res.json({ ok: false, status: 404, message: 'Not found' });
                    return;
               }
          });

          // register global web not found error
          // routers['web'].use(function (req, res) {
          //      res.status(404).render('404');
          // });

          return routers;
     }

     /**
     * Register the application server router
     *
     * @return void
     */
     async registerWorkspacesRouters() {
          const self = this;

          const routers = self.getRouters();

          // register web routers
          const Workspace = self.connection.model('Workspace');
          const workspaces = await Workspace.find().select('+dbUrl');

          await Promise.all(
               workspaces.map(
                    async workspace => {

                         // await Promise.all(
                         //      modules.map(
                         //           async _module => _module.run && await _module.run(workspace)
                         //      )
                         // );

                         await self.registerWorkspaceJobs(workspace);

                         if(workspace.hostname) {

                              // const config = require(self.getAppsPath(workspace.identifier, 'farahub.config.js'));
     
                              // workspace.getApi = (path) => `${self.dev ? 'http' : 'https'}://api.${workspace.identifier}.${self.hostname}${path}`;
                              // if (workspace.hostname) {
                              //      workspace.getApi = (path) => `${self.dev ? 'http' : 'https'}://api.${workspace.hostname}${path}`;
                              // }
     
                              // if (config.type == "next") {
                              //      // register next app
                              //      const dir = self.getAppsPath(workspace.identifier);
                              //      if (fs.existsSync(dir)) {
                              //           const nextApp = next({ dev: self.dev, dir });
                              //           workspace._next = nextApp;
                              //           await workspace._next.prepare();
                              //      }
                              // }
     
                              const app = self.createExpressApp({ hostname: workspace.hostname });
     
                              // config workspace locale
                              const localesPath = self.getAppsPath(workspace.identifier, 'locales');
                              if (fs.existsSync(localesPath)) {
                                   const i18n = new I18n({
                                        defaultLocale: 'fa',
                                        locales: ['fa', 'en'],
                                        directory: self.getAppsPath(workspace.identifier, 'locales'),
                                        queryParameter: 'locale',
                                        header: 'farahub-accept-language',
                                        objectNotation: true
                                   });
                                   app.use(i18n.init);
                              }
     
                              app.use(expressLayouts);
                              app.set('layout', false);
                              // app.set("layout extractScripts", true);
                              app.set('view engine', 'ejs');
     
                              app.use(cookieParser());
     
                              app.use(referrerPolicy({ policy: 'no-referrer-when-downgrade' }));
     
                              // config session
                              var sessionConfig = {
                                   name: 'farahub',
                                   secret: 'farahub-session-secret',
                                   resave: false,
                                   saveUninitialized: false,
                                   cookie: {
                                        path: '/',
                                        secure: false,
                                        domain: workspace.hostname
                                   }
                              }
     
                              if (!this.dev) {
                                   app.set('trust proxy', 1)
                                   sessionConfig.cookie.secure = true
                              }
     
                              app.use(session(sessionConfig));
                              app.use(flash());
     
                              app.use(passport.authenticate('session'));
     
                              // config static
                              app.use(express.static(self.getAppsPath(workspace.identifier, 'public')));
     
                              // config api routes
                              // app.use(subdomain(`api.${workspace.identifier}`, routers['api']));
     
                              // if (workspace.hostname) {
                                   app.use(subdomain('api', routers['api']));
                              // }
     
                              // config hub routes
                              // function overrideRenderAndLayout(appRootPath) {
                              //      return function (req, res, next) {
                              //           let resolveViewPath = view => self.getAppsPath(appRootPath, 'views', view);
                              //           let _render = res.render;
                              //           res.render = function (view, options, fn) {
                              //                options = options || {};
                              //                options = {
                              //                     ...options,
                              //                     layout: options.layout ? resolveViewPath(options.layout) : undefined
                              //                }
                              //                _render.call(this, resolveViewPath(view), options, fn);
                              //           };
                              //           next();
                              //      }
                              // }
     
                              // app.use(subdomain(`my.${workspace.identifier}`, express.Router()
                              //      .use(asyncMiddleware(WorkspaceFacade.resolveFromModel(workspace, self)))
                              //      .use(express.static(self.getAppsPath('hub', 'public')))
                              //      .use(View.setRenderBasePath(self.getAppsPath('hub', 'views')))
                              //      .use('*', function (req, res) {
                              //           const hubPath = self.getAppsPath('hub', 'controllers', 'index.js');
                              //           return require(hubPath)(req, res);
                              //      })
                              // ));
     
                              // if (workspace.hostname) {
                                   app.use(subdomain('my', express.Router()
                                        .use(asyncMiddleware(WorkspaceFacade.resolveFromModel(workspace, self)))
                                        .use(express.static(self.getAppsPath('hub', 'public')))
                                        .use(View.setRenderBasePath(self.getAppsPath('hub', 'views')))
                                        .use('*', function (req, res) {
                                             const hubPath = self.getAppsPath('hub', 'controllers', 'index.js');
                                             return require(hubPath)(req, res);
                                        })
                                   ));
                              // }
     
                              // register app base web routes
                              const routerPath = self.getAppsPath(workspace.identifier, 'router.js');
                              if (fs.existsSync(routerPath)) {
                                   app.use('/', [
                                        asyncMiddleware(WorkspaceFacade.resolveFromModel(workspace, self)),
                                        View.setRenderBasePath(self.getAppsPath(workspace.identifier, 'views')),
                                        require(routerPath)
                                   ])
                              }

                             // config base @ routing for domains
                              if (workspace.hostname === self.hostname) {
                                   // register web router one time for all workspaces and one time for farahub.com
                                   // farahub.com must be after that not overwrite /@{ws} routes
                                   workspaces.filter(w => w.hostname !== self.hostname).map(ws => {
                                        Object.keys(routers).filter(r => r !== 'api').forEach(
                                             key => {
                                                  app.use(`/@${ws.identifier}/`.concat(key === 'web' ? '' : key),
                                                       [
                                                            asyncMiddleware(WorkspaceFacade.resolveFromModel(ws, self)),
                                                            routers[key]
                                                       ]);
                                             }
                                        )
                                   })
                              } 
     
                              // register modules base web routes
                              Object.keys(routers).filter(r => r !== 'api').forEach(
                                   key => {
                                        app.use('/'.concat(key === 'web' ? '' : key),
                                             [
                                                  asyncMiddleware(WorkspaceFacade.resolveFromModel(workspace, self)),
                                                  // View.setRenderBasePath(self.getAppsPath(workspace.identifier, 'views')),
                                                  routers[key]
                                             ]);
                                   }
                              )
                              
     
                              // self.server.use(vhost(`${workspace.identifier}.${self.hostname}`, app));
                              // self.server.use(vhost(`www.${workspace.identifier}.${self.hostname}`, app));
                              // self.server.use(vhost(`my.${workspace.identifier}.${self.hostname}`, app));
                              // self.server.use(vhost(`api.${workspace.identifier}.${self.hostname}`, app));
     
                              // register seperate host
                              // if (workspace.hostname) {
     
                                   self.server.use(vhost(workspace.hostname, app));
                                   self.server.use(vhost(`www.${workspace.hostname}`, app));
                                   self.server.use(vhost(`my.${workspace.hostname}`, app));
                                   self.server.use(vhost(`api.${workspace.hostname}`, app));
                              // }
                         }
                    }
               )
          );
     }

     /**
      * Create http server
      * 
      * @return requestListener
      */
     createHttpServer(requestListener) {
          const server = http.createServer(requestListener);

          server.listen(
               process.env.PORT_HTTP,
               () => console.log('Farahub is running on port '.concat(process.env.PORT_HTTP))
          );

          return server;
     }

     /**
      * Resolve SSL object from path
      * 
      * @params path
      * 
      * @returns {object} ssl object
      */
     resolveSsl(...paths) {
          return {
               key: fs.readFileSync(
                    path.join(...paths, './private.key'),
                    'utf8'
               ),
               cert: fs.readFileSync(
                    path.join(...paths, './certificate.crt'),
                    'utf8'
               ),
               ca: fs.readFileSync(
                    path.join(...paths, './ca_bundle.crt'),
                    'utf8'
               )
          }
     }

     /**
      * Create https server
      * 
      * @return requestListener
      */
     async createHttpsServer(requestListener) {

          const server = https.createServer(this.resolveSsl(this.getSslPath(this.hostname)), requestListener);
          server.addContext(`api.${this.hostname}`, this.resolveSsl(this.getSslPath(this.hostname, 'api')));
          server.addContext(`my.${this.hostname}`, this.resolveSsl(this.getSslPath(this.hostname, 'hub')));

          // const workspaces = await this.connection.model('Workspace').find({ hostname: { $ne: null } });

          // await Promise.all(
          //      workspaces.map(
          //           workspace => {
          //                server.addContext(workspace.hostname, this.resolveSsl(this.getSslPath(workspace.hostname)));
          //                server.addContext(`api.${workspace.hostname}`, this.resolveSsl(this.getSslPath(workspace.hostname, 'api')));
          //                server.addContext(`my.${workspace.hostname}`, this.resolveSsl(this.getSslPath(workspace.hostname, 'hub')));
          //           }
          //      )
          // )

          server.listen(
               process.env.PORT_HTTPS,
               () => console.log('Farahub is running on port '.concat(process.env.PORT_HTTPS))
          );

          return server;
     }

     /**
      * Register socketIO server
      * 
      */
     async registerSocketIOServer(server) {

          const self = this;

          // create io server
          self.io = new IOServer(server, {
               cors: {
                    origin: self.dev ? '*' : function (origin, callback) {
                         self.connection.model('Workspace')
                              .find({ hostname: { $ne: null } })
                              .then(function (workspaces) {
                                   callback(undefined, workspaces.map(ws => `https://my.${ws.hostname}`));
                              });
                    },
                    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
               }
          });

          // register all modules sockets
          self.io.on('connection', async socket => {

               self.modules.forEach((module) => {
                    module.sockets.forEach(Socket => {
                         const instance = new Socket(module);
                         instance.register(socket);
                    });
               });

          })
     }

     /**
      * Register sub application
      * 
      * @returns server
      */
     createExpressApp({ hostname }) {

          // create express instance
          const server = express();

          // parse application/x-www-form-urlencoded
          server.use(bodyParser.urlencoded({ extended: false }));

          // parse application/json
          server.use(bodyParser.json());

          // config cors
          server.use(cors({
               origin: '*',
               // origin: this.dev ? '*' : [
               //      `https://${hostname}`,
               //      `https://my.${hostname}`
               // ],
               methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
          }));

          // config powered by
          server.use(function (req, res, next) {
               res.set('X-Powered-By', 'Farahub');
               next();
          });

          // capture device info
          server.use(device.capture());

          // return server
          return server;
     }

     /**
     * Register the application server
     *
     * @return void
     */
     registerServer() {

          // create http, https & socketio servers
          // if (this.dev) {

               this.server = this.createExpressApp({ hostname: "localhost" });

               // create http server
               const httpServer = this.createHttpServer(this.server);

               // create socketIO server
               this.registerSocketIOServer(httpServer);

          // } else {

          //      this.server = express();

          //      // create https server
          //      const httpsServer = this.createHttpsServer(this.server);

          //      // redirect from http to https
          //      this.createHttpServer((req, res) => {
          //           res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
          //           res.end();
          //      });

          //      // create socketIO server
          //      this.registerSocketIOServer(httpsServer);
          // }
     }

     /**
      * Register the application modules hooks
      *
      * @return void
      */
     registerHooks() {
          const self = this;
          this.modules.forEach((module) => {
               const hooks = typeof (module.hooks) === "function" ?
                    module.hooks(module) :
                    module.hooks;
               if (hooks) {
                    forOwn(hooks, (value, key) => {
                         if (self.module(key)) {
                              self.module(key).registerInjections(value);
                         }
                    })
               }
          })
     }

     /**
      * Register the application listeners
      *
      * @return void
      */
     registerListeners() {
          const self = this;
          self.modules.forEach((module) => {
               if (module.listeners) {
                    module.listeners.forEach((listeners, event) => {
                         listeners.forEach(listener => {
                              const eventName = [
                                   camelCase(module.name),
                                   camelCase(event.name)
                              ].join(':')
                              self.on(eventName, listener.handle.bind(listener));
                         })
                    })
               }
          })
     }

     /**
      * Register workspace jobs
      *
      * @return void
      */
     async registerWorkspaceJobs(workspace) {
          const self = this;

          workspace.agenda = new Agenda({
               db: {
                    address: workspace.dbUrl,
                    collection: 'agenda_jobs'
               }
          });
          await workspace.agenda.start();

          const modules = await workspace.resolveModulesHereditary(self);
          await Promise.all(
               modules.map(
                    async _module => {
                         if (_module.jobs) {
                              await Promise.all(
                                   _module.jobs.map(async Job => {
                                        const job = new Job(self, workspace);
                                        if (!job.interval())
                                             throw new Error('No interval has been set for job '.concat(job.identifier));

                                        workspace.agenda.define(
                                             job.identifier,
                                             async data => (await (new Job(self, workspace)).prepare()).handle(data)
                                        );
                                        await workspace.agenda.every(job.interval(), job.identifier);
                                   })
                              )
                         }
                    }
               )
          );
     }

     /**
     * Get specific workspace connection
     *
     * @param string workspaceId
     * @return Connection
     */
     getConnection(workspaceId) {
          return this.connections[workspaceId];
     }

     /**
     * Get specific module of the application
     *
     * @param string modelName
     * @return Model
     */
     model(modelName) {
          return this.connection.model(modelName);
     }

     /**
     * Check if the application has specific model
     *
     * @param string modelName
     * @return void
     */
     hasModel(modelName) {
          return Boolean(this.model(modelName));
     }

     /**
     * Get specific module of the application
     *
     * @param string moduleName
     * @return Module
     */
     module(moduleName) {
          return this.modules.filter(
               module => String(moduleName).toLowerCase() === String(module.name).toLowerCase()
          )[0];
     }

     /**
     * Check if the application has specific module
     *
     * @param string ModuleName
     * @return void
     */
     hasModule(moduleName) {
          return Boolean(this.module(moduleName));
     }

     /**
     * Get path from application root directory
     *
     * @return string
     */
     getRootPath(...paths) {
          return path.join(this.rootPath, ...paths);
     }

     /**
     * Get path from application apps directory
     *
     * @return string
     */
     getAppsPath(...paths) {
          return path.join(this.appsPath, ...paths);
     }

     /**
     * Get path from application modules directory
     *
     * @return string
     */
     getModulesPath(...paths) {
          return path.join(this.modulesPath, ...paths);
     }

     /**
     * Get path from application specific module directory
     *
     * @param {string} moduleName
     * @return string
     */
     getModulePath(module, ...paths) {
          return this.getModulesPath(module, ...paths);
     }
}

module.exports = Application