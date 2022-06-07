/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {Families}   = require('../orm/models');
const QueryBuilder = require('../utils/QueryBuilder');
const NSErrors     = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = [];
const queryBuilder     = new QueryBuilder(Families, restrictedFields, defaultFields);

const getFamilies = async (PostBody) => queryBuilder.find(PostBody, true);

const getFamily = async (PostBody) => queryBuilder.findOne(PostBody, true);

const saveFamily = async (family) => {
    if (!family) throw NSErrors.UnprocessableEntity;
    let _family = null;
    if (family._id) {
        _family = await Families.findOneAndUpdate({_id: family._id}, family);
    } else {
        _family = await Families.create(family);
    }
    if (family.id_parent) {
        await Families.findOneAndUpdate({_id: family.id_parent}, {$push: {children: _family._id}}, {new: true});
    }
    return _family;
};

const deleteFamily = async (_id) => {
    if (!_id) throw NSErrors.UnprocessableEntity;
    const result = await Families.findOneAndDelete({_id});
    return result.ok === 1;
};

module.exports = {
    getFamilies,
    getFamily,
    saveFamily,
    deleteFamily
};