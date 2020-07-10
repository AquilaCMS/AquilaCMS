const path               = require('path');
const mongoose           = require('mongoose');
const {Gallery}          = require('../orm/models');
const utils              = require("../utils/utils");
const mediasUtils        = require('../utils/medias');
const NSErrors           = require("../utils/errors/NSErrors");
const cacheService       = require("./cache");

/**
 * @description Retourne toutes les galleries
 */
exports.getGalleries = async function () {
    const resultTmp = await Gallery.find({});
    const result = resultTmp.map((gallery) => {
        gallery.itemCount = gallery.items.length;
        delete gallery.items;
        return gallery;
    });
    return {datas: result, count: result.length};
};

/**
 * @description Retourne une gallerie dont l'id est passé en paramétre
 * @param _id : _id de la gallerie
 */
exports.getGallery = async function (_id) {
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
exports.getItemsGallery = async function (code, skip = null, initItemNumber = null) {
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
exports.setGallery = async function (code, initItemNumber, maxColumnNumber, _id = null) {
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
exports.setItemGallery = async function (_id, datas) {
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
exports.deleteGallery = async function (_id) {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
    const doc = await Gallery.findOneAndRemove({_id});
    for (let i = 0; i < doc.items.length; i++) {
        await mediasUtils.deleteFile(doc.items[i].src);
        cacheService.deleteCacheImage('gallery', {filename: path.basename(doc.items[i].src).split('.')[0]});
    }
    if (!doc) throw NSErrors.GalleryNotFound;
    return doc;
};

/**
 * @description Retourne la gallerie dont un item vient d'être supprimé
 * @param _id : _id de la gallerie
 * @param _id_item : id de l'item à supprimer dans la gallerie
 */
exports.deleteItemGallery = async function (_id, _id_item) {
    if (!mongoose.Types.ObjectId.isValid(_id) || !mongoose.Types.ObjectId.isValid(_id_item)) {
        throw NSErrors.InvalidObjectIdError;
    }
    const gallery = await Gallery.findOne({_id});
    const item = gallery.items.find((i) => i.id === _id_item);
    await mediasUtils.deleteFile(item.src);
    cacheService.deleteCacheImage('gallery', {filename: path.basename(item.src).split('.')[0]});
    const doc = await Gallery.findByIdAndUpdate(_id, {$pull: {items: {_id: _id_item}}}, {new: true});
    if (!doc) throw NSErrors.GalleryNotFound;
    return doc;
};
