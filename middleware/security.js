const {isAdmin} = require('../services/auth');

/**
 * Add the fields to true to the filter
 */
const securityForceActif = (arrayFieldsToActivate) => {
    return (req, res, next) => {
        // TODO : appeler securityForceFilter() pour factoriser
        const {authorization} = req.headers;
        if (!isAdmin(authorization)) {
            if (!req.body.PostBody) req.body.PostBody = {};
            const {PostBody} = req.body;
            if (!PostBody.filter) {
                PostBody.filter = {};
            }
            // Active tous les champs "arrayFieldsToActivate"
            for (let index = 0; index < arrayFieldsToActivate.length; index++) {
                PostBody.filter[arrayFieldsToActivate[index]] = true;
            }
        }

        next();
        // return PostBody;
    };
};

/**
 * Add the fields to the filter
 */
const securityForceFilter = (arrayFieldsToActivate) => {
    return (req, res, next) => {
        const {authorization} = req.headers;
        if (!isAdmin(authorization)) {
            if (!req.body.PostBody) req.body.PostBody = {};
            const {PostBody} = req.body;
            if (!PostBody.filter) {
                PostBody.filter = {};
            }
            // Active tous les champs "arrayFieldsToActivate"
            for (let index = 0; index < arrayFieldsToActivate.length; index++) {
                const keyValue = arrayFieldsToActivate[index];
                const key      = Object.keys(keyValue)[0];
                const val      = Object.values(keyValue)[0];
                PostBody.filter[key] = val;
            }
        }
        next();
    };
};

module.exports = {
    securityForceActif,
    securityForceFilter
};