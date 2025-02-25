const { isValidObjectId } = require('mongoose');
const Doc = require('./Doc');


class Workspace {

    /**
     * Resolve request workspace
     * 
     * @param {Application} app the application instance
     * @param {bool} anonymous determine if route is accessable without workspace
     */
    static resolve(app, anonymous = false) {
        return async (req, res, next) => {
            try {
                const Workspace = app.connection.model('Workspace');

                const workspaceId = req.get('workspace-id') || req.query['workspace-id'];

                if (!workspaceId || !isValidObjectId(workspaceId)) {
                    return !anonymous ? res.status(401).json({
                        ok: false,
                        message: 'Invalid workspaceId'
                    }) : next()
                }

                const workspace = await Doc.resolve(workspaceId, Workspace);

                if (!workspace) {
                    return res.status(401).json({
                        ok: false,
                        message: 'Workspace not exist'
                    })
                }

                if (!app.connections[workspaceId]) {
                    app.connections[workspaceId] = await workspace.createConnection(app);
                }

                req.workspace = res.locals.workspace = workspace;
                req.wsConnection = res.locals.db = app.connections[workspaceId];

                // const Notification = req.wsConnection.model('Notification');
                // req.notify = Notification.register(app);

                next();
            } catch (error) {
                next(error);
            }
        }
    }

    /**
     * Resolve request workspace from model
     * 
     * @param {Workspace} workspace Workspace
     * @param {Application} app the application instance
     * @param {bool} anonymous determine if route is accessable without workspace
     */
    static resolveFromModel(workspace, app, anonymous = false) {
        return async (req, res, next) => {
            try {
                if (!workspace) {
                    return res.status(401).json({
                        ok: false,
                        message: 'Workspace not exist'
                    })
                }

                if (!app.connections[workspace.id]) {
                    app.connections[workspace.id] = await workspace.createConnection(app);
                }

                req.workspace = res.locals.workspace = workspace;
                req.wsConnection = res.locals.db = app.connections[workspace.id];

                // const Notification = req.wsConnection.model('Notification');
                // req.notify = Notification.register(app);

                next();
            } catch (error) {
                next(error);
            }
        }
    }
}

module.exports = Workspace;