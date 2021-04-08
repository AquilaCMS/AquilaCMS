/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/**
 * Add the fields to true to the filter
 */
const securityForceActif = (arrayFieldsToActivate) => {
    return (req, res, next) => {
        // TODO : appeler securityForceFilter() pour factoriser
        if (req.info && !req.info.isAdmin) {
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
        if (!req.info || !req.info.isAdmin) {
            if (!req.body.PostBody) req.body.PostBody = {};
            const {PostBody} = req.body;
            if (!PostBody.filter) {
                PostBody.filter = {};
            }
            // Active tous les champs "arrayFieldsToActivate"
            for (let index = 0; index < arrayFieldsToActivate.length; index++) {
                const keyValue       = arrayFieldsToActivate[index];
                const key            = Object.keys(keyValue)[0];
                const val            = Object.values(keyValue)[0];
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