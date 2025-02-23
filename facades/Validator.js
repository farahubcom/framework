const { checkSchema, validationResult } = require("express-validator");


class Validator {

    /**
     * errors response formatter
     * 
     * @return {func}
     */
    static withFormat() {
        return ({ msg }) => [msg];
    }

    /**
     * error response json
     * 
     * @param {object} res
     * @param {{errors : object}} options
     * @return {object}
     */
    static toResponse(res, { errors, req, next }) {
        if (req.accepts('html')) {
            req.flash('errors', errors.array());
            return res.redirect(req.headers.referer);
        }
        return res.status(422).json({
            ok: false,
            errors: errors.mapped(),
            message: 'Unprocessable Entity'
        });
    }

    /**
     * validate request fields
     * 
     * @param {*} validations request validation rules
     * @param {{withFormat : func, toResponse : func}}
     * @returns {func}
     */
    static response(validations, { withFormat = undefined, toResponse = undefined } = {}) {
        return async (req, res, next) => {
            await Promise.all(validations.map(validation => validation.run(req)));

            const errors = validationResult(req).formatWith(withFormat || this.withFormat());
            if (errors.isEmpty()) {
                return next();
            }

            return toResponse ? toResponse(res, { errors, req, next }) : this.toResponse(res, { errors, req, next });
        };
    }

    /**
     * Get validator request middleware
     * 
     * @param {Validator} validator class instance
     * @return {func}
     */
    static validate(validator) {
        return async (req, res, next) => {

            const injectedValidations = req.inject ? await req.inject(validator.injectionsScope || 'validate') : [];

            const { withFormat, toResponse } = validator;

            return this.response(
                checkSchema({
                    ...validator.rules(),
                    ...Object.assign({}, ...injectedValidations)
                }),
                { withFormat, toResponse }
            )(req, res, next);
        }
    }
}

module.exports = Validator;