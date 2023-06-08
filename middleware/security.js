/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {isAdmin} = require('../utils/utils');

/**
 * Add the fields to true to the filter
 */
const securityForceActif = (arrayFieldsToActivate) => (req, res, next) => {
    // TODO : call securityForceFilter() to refactor
    if (!isAdmin(req.info)) {
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
};

/**
 * Add the fields to the filter
 */
const securityForceFilter = (arrayFieldsToActivate) => (req, res, next) => {
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

module.exports = {
    securityForceActif,
    securityForceFilter
};