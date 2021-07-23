/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const QueryBuilder           = require('../utils/QueryBuilder');
const {OptionsSet, Products} = require('../orm/models');
const NSErrors               = require('../utils/errors/NSErrors');
const restrictedFields       = [];
const defaultFields          = [];
const queryBuilder           = new QueryBuilder(OptionsSet, restrictedFields, defaultFields);
/* eslint-disable func-style */

const listOptionsSet = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

const getOptionsSet = async function (PostBody) {
    if (typeof PostBody === 'undefined' || PostBody === null) {
        throw NSErrors.UnprocessableEntity;
    }
    const result = await queryBuilder.findOne(PostBody);
    if (result === null) {
        throw NSErrors.NotFound;
    }
    return result;
};

const setOptionsSet = async function (optionsSet) {
    if (typeof optionsSet === 'undefined' || optionsSet === null) {
        throw NSErrors.UnprocessableEntity;
    }
    if (typeof optionsSet._id !== 'undefined') {
        return OptionsSet.findOneAndUpdate({_id: optionsSet._id}, optionsSet);
    }
    return OptionsSet.create(optionsSet);
};

const deleteOptionsSet = async function (_id) {
    if (typeof _id === 'undefined' || _id === null) {
        throw NSErrors.UnprocessableEntity;
    }
    const result = await OptionsSet.deleteOne({_id});
    await Products.updateMany({set_options: _id}, {$set: {set_options: null, options: []}});
    return result;
};

module.exports = {
    listOptionsSet,
    getOptionsSet,
    setOptionsSet,
    deleteOptionsSet
};