/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
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
 * @description Retourne toutes les galleries
 */
const getGalleries = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

/**
 * @description Retourne une gallerie dont l'id est passé en paramétre
 * @param _id : _id de la gallerie
 */
const getGallery = async (_id) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
    const result = await Gallery.findById(_id);
    if (!result) throw NSErrors.GalleryNotFound;
    return result;
};

/**
 * @description Retourne les items d'une gallerie dont le code est passé en paramétre
 * @param code : le code de la gallerie
 * @param skip : le nombre d'element a skip avant d'afficher les "initItemNumber" prochains elements
 * @param initItemNumber : le nombre d'item à afficher (équivalent a limit dans mongodb)
 */
const getItemsGallery = async (code, skip = null, initItemNumber = null) => {
    const doc = await Gallery.findOne({code});
    if (!doc) throw NSErrors.GalleryNotFound;
    let items = doc.items.sort((itemA, itemB) => itemA.order - itemB.order);
    if (!skip && !initItemNumber) {
        // On recupére les items d'une gallerie en fonction du skip passé en parametre et du initItemNumber de la collection
        items = items.slice(0, doc.initItemNumber);
    } else if (skip) {
        // On recupére les items d'une gallerie en fonction du skip et initItemNumber passé en parametre
        items = items.slice(skip, skip + initItemNumber);
    }
    return {datas: items, count: doc.items.length, maxColumnNumber: doc.maxColumnNumber};
};

/**
 * @description Retourne la gallerie venant d'étre ajouté ou modifié
 * @param code : code de la gallerie
 * @param initItemNumber : le nombre d'item que doit récupérer la gallerie lors de son 1ere affichage
 * @param maxColumnNumber : nombre de colone que doit fficher la gallerie
 * @param _id : _id de la gallerie, si non null alors on fera un update
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
 * @description Retourne la gallerie dont un item vient d'étre ajouté ou modifié
 * @param _id : _id de la gallerie
 * @param datas : correspond a l'item qui doit être ajouté à la gallerie
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
        // Création d'un nouvel item (ajout d'une image)
        if (datas.length === undefined) {
            if (!datas.src && !datas.content) throw NSErrors.GalleryAddItemEmptyNotFound;
            result = await Gallery.findByIdAndUpdate(_id, {$push: {items: datas}}, {new: true, runValidators: true});
        } else {
            // Si on sauvegarde l'ordre des images
            result = await Gallery.findByIdAndUpdate(_id, {$set: {items: datas}}, {new: true, runValidators: true});
        }
    }
    return result;
};

/**
 * @description Retourne la gallerie venant d'étre supprimé
 * @param _id : _id de la gallerie
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
 * @description Retourne la gallerie dont un item vient d'être supprimé
 * @param _id : _id de la gallerie
 * @param _id_item : id de l'item à supprimer dans la gallerie
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