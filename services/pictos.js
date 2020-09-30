const path         = require('path');
const {Pictos}     = require('../orm/models');
const QueryBuilder = require('../utils/QueryBuilder');
const ServiceRules = require('./rules');
const utils        = require('../utils/utils');
const mediasUtils  = require('../utils/medias');
const NSErrors     = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['code', 'filename', 'location', 'enabled', 'title', 'usedInFilters', '_id'];
const queryBuilder     = new QueryBuilder(Pictos, restrictedFields, defaultFields);

const getPictos = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const savePicto = async (picto) => {
    try {
        const result = await Pictos.findOneAndUpdate({_id: picto._id}, picto, {new: true});
        return result;
    } catch (error) {
        if (error && error.codeName === 'NotFound') {
            throw NSErrors.PictoNotFound;
        } if (error && error.codeName === 'DuplicateKey') {
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
        picto.code   = utils.slugify(picto.code);
        const result = await Pictos.create(picto);
        return result;
    }
};

const deletePicto = async (id) => {
    const result = await Pictos.findOneAndRemove({_id: id});
    const rule   = await ServiceRules.queryRule({filter: {owner_id: id}});
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
    try {
        return await ServiceRules.execRules('picto');
    } catch (error) {
        return `Erreur : ${error.message}`;
    }
};

module.exports = {
    getPictos,
    savePicto,
    createPicto,
    deletePicto,
    execRules
};