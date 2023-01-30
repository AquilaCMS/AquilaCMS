/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {isAdmin} = require('../utils/utils');

const filterCategories = (req, res, next) => {
    const {PostBody} = req.body;
    if (!isAdmin(req.info)) {
        const date           = new Date();
        PostBody.filter.$and = [
            {openDate: {$lte: date}},
            {$or: [{closeDate: {$gte: date}}, {closeDate: {$eq: undefined}}]}
        ];
    }
    next();
};

module.exports = {
    filterCategories
};