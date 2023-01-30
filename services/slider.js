/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path         = require('path');
const mongoose     = require('mongoose');
const {slugify}    = require('aql-utils');
const {Slider}     = require('../orm/models');
const mediasUtils  = require('../utils/medias');
const NSErrors     = require('../utils/errors/NSErrors');
const QueryBuilder = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = [
    '_id', 'name', 'code', 'items', 'accessibility', 'arrows', 'autoplay', 'autoplaySpeed',
    'infinite', 'fade', 'lazyLoad', 'pauseOnHover', 'slidesToShow', 'slidesToScroll', 'speed', 'swipe'
];
const queryBuilder     = new QueryBuilder(Slider, restrictedFields, defaultFields);
const filterByDate     = (item) => (!item.startDate || (new Date(item.startDate) <= Date.now())) && (!item.endDate || (new Date(item.endDate) >= Date.now()));

// See more information on react slick: https://react-slick.neostack.com/
const getSliders = async (PostBody, user = null) => {
    const results = await queryBuilder.find(PostBody, true);
    if (!user || !user.isAdmin) {
        for (let i = 0; i < results.length; i++) {
            results[i].items = results[i].items.filter(filterByDate);
        }
    }
    return results;
};
const getSlider = async (PostBody, user = null) => {
    const result = await queryBuilder.findOne(PostBody, true);
    if (result && (!user || !user.isAdmin)) {
        result.items = result.items.filter(filterByDate);
    }
    return result;
};
const getSliderById = async (id, PostBody = null, user = null) => {
    const result = await queryBuilder.findById(id, PostBody, true);
    if (result && (!user || !user.isAdmin)) {
        result.items = result.items.filter(filterByDate);
    }
    return result;
};
const setSlider = async (id, datas) => {
    const result = await Slider.findByIdAndUpdate(id, datas, {new: true});
    if (!result) throw NSErrors.SliderUpdateError;
    return result;
};

const createSlider = async (datas) => {
    datas.code = slugify(datas.code);
    return Slider.create(datas);
};

const deleteSlider = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw NSErrors.UnprocessableEntity;
    }
    const doc = await Slider.findOneAndRemove({_id: id});
    if (!doc) {
        throw NSErrors.SliderNotFound;
    }
    for (let i = 0; i < doc.items.length; i++) {
        await mediasUtils.deleteFile(doc.items[i].src);
        require('./cache').deleteCacheImage('slider', {filename: path.basename(doc.items[i].src).split('.')[0]});
    }
    return doc;
};

/**
 * @description Returns the slider from which an item has just been added or modified
 * @param _id : slider's _id
 * @param datas : corresponds to the item to be added to the slider
 */
const setItemSlider = async (_id, datas) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.UnprocessableEntity;
    let result;
    if (datas._id) {
        // Update
        if (!mongoose.Types.ObjectId.isValid(datas._id)) throw NSErrors.UnprocessableEntity;
        result = await Slider.findOneAndUpdate(
            {_id, 'items._id': datas._id},
            {$set: {'items.$': datas}},
            {new: true, runValidators: true}
        );
        if (!result) throw NSErrors.GalleryUpdateError;
    } else {
        // Create
        result = await Slider.findByIdAndUpdate(_id, {$push: {items: datas}}, {new: true, runValidators: true});
    }
    return result;
};

/**
 * @description Returns the slider from which an item has just been deleted
 * @param _id : slider's _id
 * @param _id_item : id of the item to delete in the slider
 */
const deleteItemSlider = async (_id, _id_item) => {
    if (!mongoose.Types.ObjectId.isValid(_id) || !mongoose.Types.ObjectId.isValid(_id_item)) {
        throw NSErrors.UnprocessableEntity;
    }
    const slider = await Slider.findOne({_id});
    const doc    = await Slider.findByIdAndUpdate(_id, {$pull: {items: {_id: _id_item}}}, {new: true});
    if (!doc) throw NSErrors.NotFound;
    const item = slider.items.find((i) => i.id === _id_item);
    await mediasUtils.deleteFile(item.src);
    require('./cache').deleteCacheImage('slider', {filename: path.basename(item.src).split('.')[0]});
    return doc;
};

module.exports = {
    getSliders,
    getSlider,
    getSliderById,
    setSlider,
    createSlider,
    deleteSlider,
    setItemSlider,
    deleteItemSlider
};