/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {SetAttributes, Products, Attributes} = require('../orm/models');
const NSErrors                              = require('../utils/errors/NSErrors');
const QueryBuilder                          = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = ['_id', 'code', 'name'];
const queryBuilder     = new QueryBuilder(SetAttributes, restrictedFields, defaultFields);

exports.addAttributesToProduct = async function (product, code = 'defaut') {
    product.attributes     = [];
    const setAtt           = await SetAttributes.findOne({code});
    product.set_attributes = setAtt._id;
    for (const attrs of setAtt.attributes) {
        const attr = await Attributes.findOne({_id: attrs});
        if (attr != null) {
            let arrAttr = [];
            arrAttr     = JSON.parse(JSON.stringify(attr));
            arrAttr.id  = attr._id;
            product.attributes.push(arrAttr);
        }
    }
    return product;
};

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

exports.createOrUpdateSetAttribute = async function (postBody) {
    const code                                      = postBody.code.replace(/[^A-Z0-9]+/ig, '_');
    const {name, update : updateF, questions, type} = postBody;
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
exports.deleteSetAttribute = async function (id) {
    const setAttr = await SetAttributes.findOne({_id: id});
    if (!setAttr) throw NSErrors.SetAttributeNotFound;
    if (setAttr.code === 'defaut' || setAttr.code === 'defautUser') throw NSErrors.Unauthorized;
    const product = await Products.findOne({set_attributes: setAttr._id});
    if (product) throw NSErrors.SetAttributeLinkedWithProduct;
    await setAttr.remove();
    await SetAttributes.updateMany({}, {$pull: {set_attributes: setAttr._id}});
    return {status: true};
};