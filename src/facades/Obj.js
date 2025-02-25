class Obj {

    /**
     * Expand object with multiple keys with same value
     * 
     * @param {Object} object the object to expand
     * @returns {Object} expanded object
     */
    static expand = (object) => {
        var keys = Object.keys(object);
        for (let i = 0; i < keys.length; ++i) {
            let key = keys[i],
                subkeys = key.split(/,\s?/),
                target = object[key];
            delete object[key];
            subkeys.forEach(key => object[key] = target)
        }
        return object;
    }
}

module.exports = Obj;