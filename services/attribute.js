/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose                                                 = require('mongoose');
const {Attributes, Categories, SetAttributes, Products, Users} = require('../orm/models');
const QueryBuilder                                             = require('../utils/QueryBuilder');
const NSErrors                                                 = require('../utils/errors/NSErrors');
const aqlUtils                                                 = require('aql-utils');
const utilsMedia                                               = require('../utils/medias');

const restrictedFields = [];
const defaultFields    = ['_id', 'code', 'type', 'values', 'param', 'set_attributes', 'translation'];
const queryBuilder     = new QueryBuilder(Attributes, restrictedFields, defaultFields);

const getAllAttributes = async (PostBody) => {
    if (!PostBody) {
        PostBody = {
            filter : {
                _type : {$in: ['products', null]}
            }
        };
    } else if (!PostBody.filter) {
        PostBody.filter = {
            _type : {$in: ['products', null]}
        };
    } else if (!PostBody.filter._type || PostBody.filter._type === 'products') {
        PostBody.filter._type = {$in: ['products', null]};
    }

    return queryBuilder.find(PostBody);
};

const getAttribute = async (PostBody, lean) => {
    if (!PostBody) {
        PostBody = {
            filter : {
                _type : {$in: ['products', null]}
            }
        };
    } else if (!PostBody.filter) {
        PostBody.filter = {
            _type : {$in: ['products', null]}
        };
    } else if (!PostBody.filter._type) {
        PostBody.filter._type = {$in: ['products', null]};
    }
    return queryBuilder.findOne(PostBody, lean);
};

const setAttribute = async (body) => {
    body.code         = aqlUtils.slugify(body.code);
    const updateF     = body.update;
    const setToAdd    = body.multiModifAdd;
    const setToRemove = body.multiModifRemove;

    delete body.multiModifRemove;
    delete body.multiModifAdd;
    delete body.update;

    if (body._id) {
        // update
        const attribute = await Attributes.findOne({code: body.code});
        if (attribute) {
            if (updateF) {
            // If the usedInFilters is changed from true to false
                if (attribute.usedInFilters !== body.usedInFilters && body.usedInFilters === false) {
                // Then we delete the categories.filters whose _id is the _id of the modified attribute
                    await Categories.updateMany({'filters.attributes._id': attribute._id}, {$pull: {'filters.attributes': {_id: attribute._id}}}, {new: true, runValidators: true});
                }
                const code = body.code;
                delete body.code;
                const att = await Attributes.findOneAndUpdate({code}, body, {new: true});
                await SetAttributes.updateMany({_id: {$in: setToRemove}}, {$pull: {attributes: attribute._id}});
                await SetAttributes.updateMany({_id: {$in: setToAdd}}, {$addToSet: {attributes: attribute._id}});
                for (let i = 0; i < body.set_attributes.length; i++) {
                    const {code, param, position, _id: id, type, visible, translation} = att;
                    const product_attributes                                           = {id, code, param, position, translation, type, visible};
                    if (attribute.default_value !== undefined) {
                        product_attributes.value    = att.default_value;
                        product_attributes.position = position;
                    }
                    await Products.updateMany({set_attributes: body.set_attributes[i], 'attributes.id': {$ne: id}}, {$addToSet: {attributes: product_attributes}});
                    await Users.updateMany({set_attributes: body.set_attributes[i], 'attributes.id': {$ne: id}}, {$addToSet: {attributes: product_attributes}});
                    if (body._type === 'products') {
                        // update of the name and values for the products already having this attribute
                        const prdList = await Products.find({set_attributes: body.set_attributes[i], 'attributes.id': id});
                        updateObjectAttribute(prdList, product_attributes, 'attributes');
                        const cats = await Categories.find({'filters.attributes.id_attribut': id});
                        updateObjectAttribute(cats, product_attributes, 'filters.attributes');
                    } else {
                        // update name and values for users who already have this attribute
                        const usrList = await Users.find({set_attributes: body.set_attributes[i], 'attributes.id': id});
                        updateObjectAttribute(usrList, product_attributes, 'attributes');
                    }
                }
                await Products.updateMany({set_attributes: {$nin: body.set_attributes}}, {$pull: {attributes: {code}}});
                await Users.updateMany({set_attributes: {$nin: body.set_attributes}}, {$pull: {attributes: {code}}});
                if (body.type === 'multiselect') {
                    await editValues(att);
                }
                return att;
            }

            return attribute;
        }
    }
    // we create
    const att = await Attributes.create(body);

    await SetAttributes.updateMany({_id: {$in: body.set_attributes}}, {$push: {attributes: att._id}});

    for (let i = 0; i < body.set_attributes.length; i++) {
        const product_attributes = {id: att._id, code: att.code, param: att.param, position: att.position, translation: att.translation, values: att.values, type: att.type, visible: att.visible};
        if (att.default_value !== undefined) {
            product_attributes.value = att.default_value;
        }
        await Products.updateMany({set_attributes: body.set_attributes[i]}, {$push: {attributes: product_attributes}});
        await Users.updateMany({set_attributes: body.set_attributes[i]}, {$push: {attributes: product_attributes}});
    }
    return att;
};

const updateObjectAttribute = async (list, attr, path) => {
    try {
        for (let j = 0; j < list.length; j++) {
            const obj                                         = list[j].toObject();
            const attrIndex                                   = getAttribsFromPath(obj, path).findIndex((_attr) => _attr.code === attr.code);
            getAttribsFromPath(obj, path)[attrIndex].code     = attr.code;
            getAttribsFromPath(obj, path)[attrIndex].param    = attr.param;
            getAttribsFromPath(obj, path)[attrIndex].type     = attr.type;
            getAttribsFromPath(obj, path)[attrIndex].visible  = attr.visible;
            getAttribsFromPath(obj, path)[attrIndex].position = attr.position;
            for (let k = 0; k < Object.keys(attr.translation).length; k++) {
                const lng = Object.keys(attr.translation)[k];
                if (getAttribsFromPath(obj, path)[attrIndex].translation[lng] === undefined) {
                    getAttribsFromPath(obj, path)[attrIndex].translation[lng] = {};
                }
                getAttribsFromPath(obj, path)[attrIndex].translation[lng].name   = attr.translation[lng].name;
                getAttribsFromPath(obj, path)[attrIndex].translation[lng].values = attr.translation[lng].values;
            }
            switch (list[j].collection.collectionName) {
            case 'products':
                await Products.updateOne({_id: obj._id.toString()}, {$set: {attributes: obj.attributes}});
                break;
            case 'categories':
                delete obj.id;
                await Categories.updateOne({_id: obj._id.toString()}, {$set: {filters: obj.filters}});
                break;
            case 'users':
                await Users.updateOne({_id: obj._id.toString()}, {$set: {attributes: obj.attributes}});
                break;
            default:
                break;
            }
        }
    } catch (e) {
        console.error(e);
    }
};

const getAttribsFromPath = (obj, path) => {
    const splittedPath = path.split('.');
    let value          = obj;
    for (let i = 0; i < splittedPath.length; i++) {
        value = value[splittedPath[i]];
    }
    return value;
};

const editValues = async (attribute) => {
    if (attribute._type === 'products') {
        const products = await Products.find({'attributes.code': attribute.code});
        // we loop on all the products
        await applyAttribChanges(products, attribute, 'products');
    } else {
        const users = await Users.find({'attributes.code': attribute.code});
        // we loop on all users
        await applyAttribChanges(users, attribute, 'users');
    }
};

async function applyAttribChanges(tab, attribute, model) {
    for (let i = 0; i < tab.length; i++) {
        let isEdit = false;
        // we retrieve the altered attribute of the product via its code
        const attrIndex = tab[i].attributes.findIndex((attr) => attr.code === attribute.code);
        const langs     = Object.keys(tab[i].attributes[attrIndex].translation);
        // we loop on each of the languages of the attribute
        for (let ii = 0; ii < langs.length; ii++) {
        // we check that the values of the product still exist the values
            const valueLength = tab[i].attributes[attrIndex].translation[langs[ii]].value ? tab[i].attributes[attrIndex].translation[langs[ii]].value.length : 0;
            for (let iii = 0; iii < valueLength; iii++) {
                if (!attribute.translation[langs[ii]].values.includes(tab[i].attributes[attrIndex].translation[langs[ii]].value[iii])) {
                    tab[i].attributes[attrIndex].translation[langs[ii]].value.splice(iii, 1);
                    isEdit = true;
                }
            }
        }
        if (isEdit) {
            await mongoose.model(model).updateOne({_id: tab[i]._id}, {$set: tab[i]});
        }
    }
}

const remove = async (_id) => {
    _id             = mongoose.Types.ObjectId(_id);
    const attribute = await Attributes.findOne({_id});
    if (!attribute) {
        throw NSErrors.NotFound;
    }
    await Promise.all([
        await Products.updateMany({}, {$pull: {attributes: {id: _id}}}),
        await Users.updateMany({}, {$pull: {attributes: {id: _id}}}),
        await SetAttributes.updateMany({_id: {$in: attribute.set_attributes}}, {$pull: {attributes: _id}})
    ]);

    await attribute.remove();
    await utilsMedia.deleteFile(`medias/attributes/${_id}`);
};

module.exports = {
    getAllAttributes,
    getAttribute,
    setAttribute,
    remove
};