/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path         = require('path');
const mongoose     = require('mongoose');
const {Gallery}    = require('../orm/models');
const utils        = require('../utils/utils');
const mediasUtils  = require('../utils/medias');
const NSErrors     = require('../utils/errors/NSErrors');
const cacheService = require('./cache');

const QueryBuilder     = require('../utils/QueryBuilder');
const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Gallery, restrictedFields, defaultFields);

/**
 * @description Return all galleries
 */
const getGalleries = async (PostBody) => queryBuilder.find(PostBody, true);

/**
 * @description Returns a gallery whose id is passed in parameter
 * @param _id : _id from the gallery
 */
const getGallery = async (_id) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
    const result = await Gallery.findById(_id).lean();
    if (!result) throw NSErrors.GalleryNotFound;
    return result;
};

/**
 * @description Returns the items of a gallery for code in parameter
 * @param code : the gallery code
 * @param skip : the number of items to skip before displaying the next "initItemNumber" items
 * @param initItemNumber : the number of items to display (equivalent to limit in mongodb)
 */
const getItemsGallery = async (code, skip = null, initItemNumber = null) => {
    const doc = await Gallery.findOne({code}).lean();
    if (!doc) throw NSErrors.GalleryNotFound;
    let items = doc.items.sort((itemA, itemB) => itemA.order - itemB.order);
    if (!skip && !initItemNumber) {
        // Get the items of a gallery according to the skip passed in parameter and the initItemNumber of the collection
        items = items.slice(0, doc.initItemNumber);
    } else if (skip) {
        // Get the items of a gallery according to the skip and initItemNumber passed in parameter
        items = items.slice(skip, skip + initItemNumber);
    }
    return {datas: items, count: doc.items.length, maxColumnNumber: doc.maxColumnNumber};
};

/**
 * @description Returns the (current added/modified) gallery
 * @param code : gallery code
 * @param initItemNumber : the number of items that the gallery must retrieve when it is first displayed
 * @param maxColumnNumber : number of columns that the gallery must display
 * @param _id : _id from the gallery, if not null then we will do an update
 */
const setGallery = async (code, initItemNumber, maxColumnNumber, _id = null) => {
    let result;
    code = utils.slugify(code);
    if (_id) {
        // Update
        if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
        result = await Gallery.findByIdAndUpdate(_id, {code, initItemNumber, maxColumnNumber}, {new: true, runValidators: true});
        if (!result) throw NSErrors.GalleryUpdateError;
    } else {
        // Create
        result = await Gallery.create({code});
    }
    return result;
};

/**
 * @description Returns the gallery where an item has just been added or modified
 * @param _id : _id from the gallery
 * @param datas : corresponds to the item that must be added to the gallery
 */
const setItemGallery = async (_id, datas) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
    let result;
    if (datas._id) {
        // Update
        if (!mongoose.Types.ObjectId.isValid(datas._id)) throw NSErrors.InvalidObjectIdError;
        if (!datas.src && !datas.content) throw NSErrors.GalleryAddItemEmptyNotFound;
        result = await Gallery.findOneAndUpdate(
            {_id, 'items._id': datas._id},
            {$set: {'items.$': datas}},
            {new: true, runValidators: true}
        );
        if (!result) throw NSErrors.GalleryUpdateError;
    } else {
        // Creation of a new item (add image)
        if (datas.length === undefined) {
            if (!datas.src && !datas.content) throw NSErrors.GalleryAddItemEmptyNotFound;
            result = await Gallery.findByIdAndUpdate(_id, {$push: {items: datas}}, {new: true, runValidators: true});
        } else {
            // If we save the order of the images
            result = await Gallery.findByIdAndUpdate(_id, {$set: {items: datas}}, {new: true, runValidators: true});
        }
    }
    return result;
};

/**
 * @description Return the gallery just deleted
 * @param _id : _id from the gallery
 */
const deleteGallery = async (_id) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
    const doc = await Gallery.findOneAndRemove({_id});
    if (!doc) {
        throw NSErrors.GalleryNotFound;
    }
    for (let i = 0; i < doc.items.length; i++) {
        await mediasUtils.deleteFile(doc.items[i].src);
        cacheService.deleteCacheImage('gallery', {filename: path.basename(doc.items[i].src).split('.')[0]});
    }
    return doc;
};

/**
 * @description Returns the gallery from which an item has just been deleted
 * @param _id : _id from the gallery
 * @param _id_item : id of the item to delete in the gallery
 */
const deleteItemGallery = async (_id, _id_item) => {
    if (!mongoose.Types.ObjectId.isValid(_id) || !mongoose.Types.ObjectId.isValid(_id_item)) {
        throw NSErrors.InvalidObjectIdError;
    }
    const gallery = await Gallery.findOne({_id});
    const item    = gallery.items.find((i) => i.id === _id_item);
    await mediasUtils.deleteFile(item.src);
    cacheService.deleteCacheImage('gallery', {filename: path.basename(item.src).split('.')[0]});
    const doc = await Gallery.findByIdAndUpdate(_id, {$pull: {items: {_id: _id_item}}}, {new: true});
    if (!doc) throw NSErrors.GalleryNotFound;
    return doc;
};

module.exports = {
    getGalleries,
    getGallery,
    getItemsGallery,
    setGallery,
    setItemGallery,
    deleteGallery,
    deleteItemGallery
};