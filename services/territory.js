/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {Territory}  = require('../orm/models');
const QueryBuilder = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Territory, restrictedFields, defaultFields);

exports.getTerritories = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

exports.getTerritory     = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};
exports.getTerritoryById = async function (id, PostBody = null) {
    return queryBuilder.findById(id, PostBody);
};

/**
 * Delete Territory
 */
exports.deleteTerritory = async function (_id) {
    await Territory.deleteOne({_id});
};

/**
 * Save or edit Territory
 */
exports.setTerritory = async function (territory) {
    const _id = territory._id;
    if (territory._id) {
        delete territory._id;
    }
    territory.type     = 'country';
    territory.children = [];

    if (typeof _id === 'undefined') {
        await Territory.create(territory);
    } else {
        await Territory.updateOne({_id}, {$set: territory});
    }
};