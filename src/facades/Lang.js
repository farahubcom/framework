class Lang {

    /**
     * Translate collection to specific locale recursively
     * 
     * @param {Object|Array} collection the collection to translate
     * @param {string} locale the locale to translate
     * 
     * @returns {Object|Array} translated collection
     */
    static translate(collection, locale = 'fa-IR') {

        if (!collection || typeof collection !== "object")
            return collection;

        if (Array.isArray(collection))
            return collection.map(i => this.translate(i, locale));

        Object.keys(collection).forEach(
            (key, index) => {

                const value = collection[key];

                // return the value in case of null, undefined
                if (!value) {
                    collection[key] = value;
                    return;
                }

                if (Array.isArray(value)) {
                    collection[key] = value.map(v => this.translate(v, locale));
                    return;
                }

                if (typeof value === "object") {

                    if (locale in value) {
                        collection[key] = collection[key][locale];
                        return;
                    }

                    if (!(value instanceof Date)) {
                        collection[key] = this.translate(value, locale);
                        return;
                    }

                    collection[key] = value;
                    return;
                }

                collection[key] = value;
                return;
            }
        )

        return collection;
    }
}

module.exports = Lang