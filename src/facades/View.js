const path = require('path');

class View {

    /**
     * change render base path for current request
     * 
     * @param {string} basePath string
     * @returns func
     */
    static setRenderBasePath = (basePath) => {
        return function (req, res, next) {
            const resolveViewPath = view => path.join(basePath, view);
            let _render = res.render;
            res.render = function (view, options, fn) {
                options = options || {};
                options = {
                    ...options,
                    layout: options.layout ? resolveViewPath(options.layout) : undefined
                }
                _render.call(this, resolveViewPath(view), options, fn);
            };
            next();
        }
    }

    /**
     * Get view title
     * 
     * @param {Object} object the object to expand
     * @returns {Object} expanded object
     */
    static getTitle = (workspace, title) => {
        const seperator = [' ', workspace.getOption('site:title-seperator', '|'), ' '].join('');

        return [
            title,
            workspace.getOption('site:name', workspace.name.get('fa-IR'))
        ].filter(Boolean).join(seperator);
    }
}

module.exports = View;