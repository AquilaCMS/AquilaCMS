/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const QueryBuilder     = require('../utils/QueryBuilder');
const {Options}        = require('../orm/models');
const NSErrors         = require('../utils/errors/NSErrors');
const restrictedFields = [];
const defaultFields    = [];
const queryBuilder     = new QueryBuilder(Options, restrictedFields, defaultFields);

/* eslint-disable func-style */

const listOptions = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

const getOptions = async function (PostBody) {
    if (typeof PostBody === 'undefined' || PostBody === null) {
        throw NSErrors.UnprocessableEntity;
    }
    return queryBuilder.findOne(PostBody);
};

const setOptions = async function (options) {
    if (typeof options === 'undefined' || options === null) {
        throw NSErrors.UnprocessableEntity;
    }
    if (typeof options._id !== 'undefined') {
        return Options.findOneAndUpdate({_id: options._id}, options, {new: true, runValidators: true});
    }
    return Options.create(options);
};

const deleteOptions = async function (_id) {
    if (typeof _id === 'undefined' || _id === null) {
        throw NSErrors.UnprocessableEntity;
    }
    const result = await Options.deleteOne({_id});
    // need to remove them in optionsSet TODO
    return result;
};

module.exports = {
    listOptions,
    getOptions,
    setOptions,
    deleteOptions
};