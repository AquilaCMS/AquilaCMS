/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const QueryBuilder     = require('../utils/QueryBuilder');
const {OptionsSet}     = require('../orm/models');
const restrictedFields = [];
const defaultFields    = [];
const queryBuilder     = new QueryBuilder(OptionsSet, restrictedFields, defaultFields);

/* eslint-disable func-style */

const listOptionsSet = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

const getOptionsSet = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};

const setOptionsSet = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};

module.exports = {
    listOptionsSet,
    getOptionsSet,
    setOptionsSet
};