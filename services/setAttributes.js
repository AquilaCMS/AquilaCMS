/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {SetAttributes, Products} = require('../orm/models');
const NSErrors                  = require('../utils/errors/NSErrors');
const QueryBuilder              = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = ['_id', 'code', 'name'];
const queryBuilder     = new QueryBuilder(SetAttributes, restrictedFields, defaultFields);

exports.getSetAttributes = async function (PostBody) {
    if (!PostBody) {
        PostBody = {
            filter : {
                type : {$in: ['products', null]}
            }
        };
    } else if (!PostBody.filter) {
        PostBody.filter = {
            type : {$in: ['products', null]}
        };
    } else if (!PostBody.filter.type || PostBody.filter.type === 'products') {
        PostBody.filter.type = {$in: ['products', null]};
    }

    return queryBuilder.find(PostBody);
};
exports.getSetAttribute = async function (PostBody) {
    if (!PostBody) {
        PostBody = {
            filter : {
                type : {$in: ['products', null]}
            }
        };
    } else if (!PostBody.filter) {
        PostBody.filter = {
            type : {$in: ['products', null]}
        };
    } else if (!PostBody.filter.type || PostBody.filter.type === 'products') {
        PostBody.filter.type = {$in: ['products', null]};
    }
    return queryBuilder.findOne(PostBody);
};
exports.getSetAttributeById = async function (id, PostBody = null) {
    return queryBuilder.findById(id, PostBody);
};

exports.setSetAttribute = async function (code, name, attributes) {
    const upd = {code, name};
    if (attributes) {
        upd.attributes = attributes;
    }
    return SetAttributes.findOneAndUpdate({code}, {$set: upd}, {upsert: true, new: true});
};

exports.createOrUpdateSetAttribute = async function (req) {
    const code                                      = req.body.code.replace(/[^A-Z0-9]+/ig, '_');
    const {name, update : updateF, questions, type} = req.body;
    const setAttribute                              = await SetAttributes.findOne({code});
    if (setAttribute && updateF) {
        const resSetAttribute = await SetAttributes.findOneAndUpdate({code}, {name, questions, type}, {new: true});
        if (!resSetAttribute) throw NSErrors.SetAttributeNotFound;
        let tQuestions = [];
        if (resSetAttribute.questions.length) {
            tQuestions = resSetAttribute.questions.map((question) => ({idQuestion: question._id, translation: question.translation}));
        }
        await Products.updateMany({set_attributes: setAttribute.id}, {$set: {'reviews.questions': tQuestions}});
        return {status: true};
    }
    await SetAttributes.create({code, name, questions, type});
    return {status: true};
};
exports.deleteSetAttribute = async function (req) {
    const setAttr = await SetAttributes.findOne({_id: req.params.id});
    if (!setAttr) throw NSErrors.SetAttributeNotFound;
    const product = await Products.findOne({set_attributes: setAttr._id});
    if (product) throw NSErrors.SetAttributeLinkedWithProduct;
    await setAttr.remove();
    await SetAttributes.updateMany({}, {$pull: {set_attributes: setAttr._id}});
    return {status: true};
};