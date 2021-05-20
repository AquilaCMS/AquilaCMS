/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {Trademarks, Products} = require('../orm/models');
const QueryBuilder           = require('../utils/QueryBuilder');
const NSErrors               = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['_id', 'name', '_slug'];
const queryBuilder     = new QueryBuilder(Trademarks, restrictedFields, defaultFields);

exports.getTrademarks    = async function (PostBody) {
    return queryBuilder.find(PostBody);
};
exports.getTrademark     = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};
exports.getTrademarkById = async function (id, PostBody = null) {
    return queryBuilder.findById(id, PostBody);
};

exports.saveTrademark = async function (req) {
    if (req.body._id) {
        // update
        const result = await Trademarks.findOneAndUpdate({_id: req.body._id}, req.body, {upsert: true, new: true});
        if (!result) {
            return {status: false};
        }
        return result;
    }
    // creation
    const result = await Trademarks.create({name: req.body.name});
    if (!result) {
        return {status: false};
    }
    return result;
};

exports.deleteTrademark = async function (req) {
    const _trademark = await Trademarks.findOne({_id: req.params.id});
    if (!_trademark) throw NSErrors.TradeMarkNotFound;
    await Products.updateMany({}, {$unset: {trademark: {id: _trademark._id}}});
    const result = await Trademarks.deleteOne({_id: _trademark._id});
    return {status: !!result.ok};
};
