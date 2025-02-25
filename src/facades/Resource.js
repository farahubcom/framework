class Resource {

    /**
     * Make resource
     */
    static make(ResourceClass, data) {
        if (Array.isArray(data)) {
            // Transform each item in the collection
            return data.map(item => new ResourceClass(item).toJSON());
        }
        // Transform a single item
        return new ResourceClass(data).toJSON();
    }
}

module.exports = Resource;