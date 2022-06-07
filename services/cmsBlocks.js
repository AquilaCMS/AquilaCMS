/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {CmsBlocks}  = require('../orm/models');
const QueryBuilder = require('../utils/QueryBuilder');
const NSErrors     = require('../utils/errors/NSErrors');

const restrictedFields = ['group'];
const defaultFields    = ['_id', 'code', 'active'];
const queryBuilder     = new QueryBuilder(CmsBlocks, restrictedFields, defaultFields);

const getCMSBlocks = async (PostBody) => queryBuilder.find(PostBody, true);

const getCMSBlock = async (PostBody) => queryBuilder.findOne(PostBody, true);

const getCMSBlockById = async (id, PostBody = null) => queryBuilder.findById(id, PostBody, true);

const setCMSBlock = async (body) => {
    if (body._id) return CmsBlocks.updateOne({_id: body._id}, {$set: body});
    return CmsBlocks.create(body);
};

const deleteCMSBlock = async (code) => {
    const doc = await CmsBlocks.findOneAndRemove({code});
    if (!doc) throw NSErrors.CmsBlockNotFound;
    return doc;
};

module.exports = {
    getCMSBlocks,
    getCMSBlock,
    getCMSBlockById,
    setCMSBlock,
    deleteCMSBlock
};