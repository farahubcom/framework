const nodePath = require("path");
const fs = require("fs");
const mime = require('mime-types');

class Dispatchable {

    /**
     * Display a specific handler
     */
    dispatch(handler, ...params) {
        return this[handler](...params);
    }
}

class FileExplorer extends Dispatchable {

    /**
     * The application instance
     *
     * @var Application
     */
    _app;

    /**
     * The explorer base path
     *
     * @var string
     */
    _basePath;

    /**
     * The explorer root
     *
     * @var string
     */
    _root;

    /**
     * Create the object instance
     * @constructor
     *
     * @param {Application} app
     * @param {string} basePath
     * @param {string} root
     */
    constructor(app, basePath, root = '') {
        super();

        this._app = app;
        this._basePath = basePath;
        this._root = root;
    }

    /**
     * Resolve path from explorer base path
     *
     * @return {string}
     */
    _resolvePath(...paths) {
        return nodePath.join(this._basePath, ...paths);
    }

    /**
     * Resolve root path of the explorer
     *
     * @returns {string}
     */
    get _rootPath() {
        return this._resolvePath(this._root);
    }

    /**
     * Resolve path from explorer root path
     *
     * @returns {string}
     */
    _resolveRootPath(...paths) {
        return nodePath.join(this._rootPath, ...paths);
    }

    /**
     * Resolve path relative to root path
     *
     * @param {string} path
     * @returns {string}
     */
    _resolveRootRelative(path) {
        return nodePath.relative(this._rootPath, path);
    }

    /**
     * Get hereditary of specific path
     *
     * @param {string} path
     * @returns {array} hereditary
     */
    getPathHereditary(path) {
        let result = [];
        let hereditaryResolverPath = this._resolveRootPath(path);
        while (Boolean(this._resolveRootRelative(hereditaryResolverPath))) {
            result = [...result, {
                name: nodePath.basename(hereditaryResolverPath),
                path: this._resolveRootRelative(hereditaryResolverPath)
            }]
            hereditaryResolverPath = this._resolveRootPath(this._resolveRootRelative(hereditaryResolverPath), '..');
        }
        result = [...result, { name: '/', path: '' }];

        return result.reverse();
    }

    /**
     * Read the content of specific directory path
     *
     * @param {string} path
     * @returns {Promise<array>}
     */
    async readDirectory(path) {

        const directoryPath = this._resolveRootPath(path);
        const parentDirectoryPath = this._resolveRootPath(path, '..');
        const directoryContents = fs.readdirSync(directoryPath);
        const isSubDirectory = Boolean(this._resolveRootRelative(directoryPath));

        let contents = [];

        if (isSubDirectory) {
            contents = [...contents, {
                name: '..',
                isDirectory: true,
                size: 0,
                ext: null,
                modifiedAt: null,
                createdAt: null,
                path: this._resolveRootRelative(parentDirectoryPath),
                relativePath: null
            }]
        }

        for (let i = 0; i < directoryContents.length; i++) {
            const filePath = this._resolveRootPath(path, directoryContents[i]);
            const stat = fs.statSync(filePath);

            contents = [...contents, {
                name: directoryContents[i],
                isDirectory: stat.isDirectory(),
                size: stat.size,
                ext: nodePath.extname(filePath),
                mime: mime.lookup(filePath),
                modifiedAt: stat.mtime,
                createdAt: stat.birthtime,
                path: this._resolveRootRelative(filePath),
            }];
        }

        return {
            contents,
            prevPath: isSubDirectory ? this._resolveRootRelative(parentDirectoryPath) : null,
            currentPath: this._resolveRootRelative(directoryPath),
            hereditary: this.getPathHereditary(path)
        }
    }

    /**
     * Read file content
     *
     * @param {string} path
     * @returns {Promise<array>} file content
     */
    async readFile(path) {

        const filePath = this._resolveRootPath(path);

        return {
            name: nodePath.basename(filePath),
            data: fs.readFileSync(filePath).toString(),
            ext: nodePath.extname(filePath).slice(1)
        }
    }

    /**
     * Write file content
     *
     * @param {string} path
     * @param {string} data
     * @returns void
     */
    async writeFile(path, data) {
        const filePath = this._resolveRootPath(path);
        fs.writeFileSync(filePath, data);
    }

    /**
     * Create a new file
     *
     * @param {string} path
     * @param {string} fileName
     * @returns void
     */
    async createFile(path, fileName) {
        const filePath = this._resolveRootPath(path, fileName);
        fs.writeFileSync(filePath, '');
    }

    /**
     * Create a new directory if not exists
     *
     * @param {string} path
     * @param {string} dirName
     * @returns void
     */
    async createDirectory(path, dirName) {
        const filePath = this._resolveRootPath(path, dirName);
        fs.mkdirSync(filePath, { recursive: true });
    }

    /**
     * Rename file or folder
     *
     * @param {string} path
     * @param {string} newName
     * @returns void
     */
    async rename(path, newName) {
        const oldPath = this._resolveRootPath(path);
        const newPath = this._resolveRootPath(path, newName);
        fs.renameSync(oldPath, newPath);
    }
}

module.exports = FileExplorer;