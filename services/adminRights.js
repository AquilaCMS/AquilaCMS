/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {AdminRights} = require('../orm/models');
const QueryBuilder  = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = [];
const queryBuilder     = new QueryBuilder(AdminRights, restrictedFields, defaultFields);

const getAdminRights = async (PostBody) => queryBuilder.find(PostBody);

module.exports = {
    getAdminRights
};