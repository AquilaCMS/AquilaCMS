/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {Statics}    = require('../orm/models');
const QueryBuilder = require('../utils/QueryBuilder');
const NSErrors     = require('../utils/errors/NSErrors');

const restrictedFields = ['group'];
const defaultFields    = ['_id', 'code', 'translation'];
const queryBuilder     = new QueryBuilder(Statics, restrictedFields, defaultFields);

const getStatics = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const getStatic = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const getStaticById = async (id, PostBody = null) => {
    return queryBuilder.findById(id, PostBody);
};

const setStatic = async (req) => {
    return Statics.updateOne({_id: req.body._id}, {$set: req.body});
};

const createStatic = async (req) => {
    return Statics.create(req.body);
};

const deleteStatic = async (req) => {
    const statics = await Statics.findOne({_id: req.params.id});
    if (!statics) throw NSErrors.StaticNotFound;
    const isRemoved = await statics.remove();
    return {status: isRemoved};
};

module.exports = {
    getStatics,
    getStatic,
    getStaticById,
    setStatic,
    createStatic,
    deleteStatic
};