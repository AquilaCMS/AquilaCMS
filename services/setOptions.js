/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/*
*  This is a legacy file, not used
*/

const {SetOptions, Products} = require('../orm/models');
const NSErrors               = require('../utils/errors/NSErrors');
const QueryBuilder           = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = ['_id'];
const queryBuilder     = new QueryBuilder(SetOptions, restrictedFields, defaultFields);

exports.getSetOptions = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

exports.getSetOption     = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};
exports.getSetOptionById = async function (id, PostBody = null) {
    return queryBuilder.findById(id, PostBody);
};

exports.createOrUpdateSetAttribute = async function (req) {
    const code    = req.body.code.replace(/[^A-Z0-9]+/ig, '_');
    const name    = req.body.name;
    const updateF = req.body.update;

    const setOption = await SetOptions.findOne({code});
    if (setOption && updateF) {
        const resSetOption = await SetOptions.updateOne({code}, {name}); // TODO $set
        if (!resSetOption) throw NSErrors.SetOptionNotFound;
        return {status: true};
    }
    if (setOption && !updateF) return {alreadyExist: true};

    await SetOptions.create({code, name});
    return {status: true};
};

exports.deleteSetOption = async function (req) {
    const _setOpt = await SetOptions.findOne({_id: req.params.id});
    if (!_setOpt) throw NSErrors.SetOptionNotFound;
    Products.updateMany({set_options: _setOpt._id}, {$unset: {set_options: ''}});
    await _setOpt.remove();
    return true;
};