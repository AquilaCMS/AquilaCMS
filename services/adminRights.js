/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {AdminRights} = require('../orm/models');
const QueryBuilder  = require('../utils/QueryBuilder');
const NSErrors      = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = [];
const queryBuilder     = new QueryBuilder(AdminRights, restrictedFields, defaultFields);

const getAdminRights = async (PostBody) => queryBuilder.find(PostBody, true);

const addAdminRight = async (right) => {
    if (!right.code || !right.translate) throw NSErrors.InvalidParameters;
    try {
        return await AdminRights.create(right);
    } catch (e) {
        console.error(e);
        return e;
    }
};

const removeAdminRight = async (code) => {
    if (!code) throw NSErrors.InvalidParameters;
    try {
        return await AdminRights.deleteOne({code});
    } catch (e) {
        console.error(e);
        return e;
    }
};

module.exports = {
    getAdminRights,
    addAdminRight,
    removeAdminRight
};