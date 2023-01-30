/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {Suppliers, Products} = require('../orm/models');
const QueryBuilder          = require('../utils/QueryBuilder');
const NSErrors              = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Suppliers, restrictedFields, defaultFields);

exports.listSuppliers = async function (PostBody) {
    return queryBuilder.find(PostBody, true);
};

exports.getSupplier = async function (PostBody) {
    return queryBuilder.findOne(PostBody, true);
};

exports.saveSupplier = async function (_new) {
    if (!_new) throw NSErrors.UnprocessableEntity;
    if (_new._id) {
        return Suppliers.findOneAndUpdate({_id: _new._id}, _new);
    }
    return Suppliers.create(_new);
};

exports.deleteSupplier = async function (_id) {
    if (!_id) throw NSErrors.UnprocessableEntity;
    const result = await Suppliers.deleteOne({_id});
    await Products.updateMany({supplier_ref: _id}, {$unset: {supplier_ref: ''}});
    return result.ok === 1;
};