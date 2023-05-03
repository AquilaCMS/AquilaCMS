/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path         = require('path');
const {slugify}    = require('aql-utils');
const {Pictos}     = require('../orm/models');
const QueryBuilder = require('../utils/QueryBuilder');
const ServiceRules = require('./rules');
const mediasUtils  = require('../utils/medias');
const NSErrors     = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['code', 'filename', 'location', 'enabled', 'title', 'usedInFilters', '_id'];
const queryBuilder     = new QueryBuilder(Pictos, restrictedFields, defaultFields);

const getPictos = async (PostBody) => queryBuilder.find(PostBody, true);

const savePicto = async (picto) => {
    try {
        const result = await Pictos.findOneAndUpdate({_id: picto._id}, picto, {new: true});
        return result;
    } catch (error) {
        if (error && error.codeName === 'NotFound') {
            throw NSErrors.PictoNotFound;
        }
        if (error && error.codeName === 'DuplicateKey') {
            throw NSErrors.DuplicateKey;
        }
        throw error;
    }
};

const createPicto = async (picto) => {
    if (
        picto.code !== undefined
        && picto.title !== undefined
        && picto.filename !== undefined
        && picto.enabled !== undefined
        && picto.location !== undefined
    ) {
        picto.code   = slugify(picto.code);
        const result = await Pictos.create(picto);
        return result;
    }
};

const deletePicto = async (id) => {
    const result = await Pictos.findOneAndRemove({_id: id._id});
    if (!result) {
        throw NSErrors.PictoNotFound;
    }
    const rule = await ServiceRules.queryRule({filter: {owner_id: id}});
    if (rule) {
        await ServiceRules.deleteRule(rule._id);
    }
    if (result.filename !== '') {
        await mediasUtils.deleteFile(`medias/picto/${result.filename}`);
        require('./cache').deleteCacheImage('picto', {filename: path.basename(result.filename).split('.')[0]});
    }
    return result;
};

const execRules = async () => {
    await ServiceRules.execRules('picto');
};

module.exports = {
    getPictos,
    savePicto,
    createPicto,
    deletePicto,
    execRules
};