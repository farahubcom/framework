const mongoose = require('mongoose');

const { ObjectId } = mongoose.Types;


class Doc {

    /**
     * Resolve document
     * 
     * @param {Document|Object|ObjectId|string} document document to resolve
     * @param {Model|string} document model to cast
     * 
     * @return {mongoose.Query|null} return document if resolved, null otherwise
     */
    static resolve(document, model) {
        try {

            const Model = typeof (model) === "string" ? mongoose.model(model) : model;

            if (document instanceof Model)
                return document;

            if (typeof (document) === "object") {

                if (document instanceof ObjectId) {
                    return Model.findById(document);
                }

                if ('_id' in document) {
                    return this.resolve(document._id, model);
                }

                if ('id' in document) {
                    return this.resolve(document.id, model);
                }
            }

            if (typeof (document) === "string") {

                if (mongoose.isValidObjectId(document)) {
                    return this.resolve(ObjectId(document), model);
                }

                return null
            }

            return null;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Resolve document by identifier
     * 
     * @param {string} identifier document identifier to resolve
     * @param {Model|string} document model to cast
     * 
     * @return {Promise<Document|null>} return document if resolved, null otherwise
     */
    static resolveByIdentifier(identifier, model) {
        try {

            if (typeof identifier !== "string")
                return null;

            const Model = typeof (model) === "string" ? mongoose.model(model) : model;

            return Model.findOne({ identifier });
        } catch (err) {
            throw err;
        }
    }
}

module.exports = Doc;