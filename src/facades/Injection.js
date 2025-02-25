class Injection {

    /**
     * Register injections for specific module
     * 
     * @param {Controller} controller the controller instance
     * @param {string} scopes injections scopes
     * @param {bool} withRequest add handler to request
     * @param {bool} anonymous determine if route is accessable without workspace
     */
    static register(module, scope, { withRequest = true, core = false } = {}) {

        const getHook = hookName => [scope, hookName].join('.');

        if (withRequest) {
            return async (req, res, next) => {
                try {
                    req.inject = async (hookName, ...args) => {

                        const injections = await (
                            req.workspace && !core ?
                                req.workspace.inject(module, getHook(hookName), ...args) :
                                module.inject(getHook(hookName), ...args)
                        );

                        return injections || [];
                    }

                    next();
                } catch (error) {
                    next(error);
                }
            }
        }

        return async (hookName, ...args) => {
            const injections = await module.inject(getHook(hookName), ...args)
            return injections || [];
        };
    }
}

module.exports = Injection;