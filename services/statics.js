/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {Statics}         = require('../orm/models');
const QueryBuilder      = require('../utils/QueryBuilder');
const NSErrors          = require('../utils/errors/NSErrors');
const ServiceCategories = require('./categories');

const restrictedFields = ['group'];
const defaultFields    = ['_id', 'code', 'translation'];
const queryBuilder     = new QueryBuilder(Statics, restrictedFields, defaultFields);

const getStatics = async (PostBody) => queryBuilder.find(PostBody, true);

const getStatic = async (PostBody) => queryBuilder.findOne(PostBody, true);

const getStaticById = async (id, PostBody = null) => queryBuilder.findById(id, PostBody, true);

const setStatic = async (postBody) => {
    const oldStatic = await getStatic({filter: {code: postBody.code}, structure: '*', limit: 1});
    // we first get the old slug
    const newStatic = await Statics.updateOne({_id: postBody._id}, {$set: postBody});
    // we check for each languages if the slug is different
    for (const oneLang in oldStatic.translation) {
        if (oldStatic.translation[oneLang].hasOwnProperty('slug')) {
            const slug    = oldStatic.translation[oneLang].slug;
            const newSlug = postBody.translation[oneLang].slug;
            if (slug !== newSlug) {
                // if it is different we change the slug for each gallery
                const postbody = {
                    filter : {
                        [`translation.${oneLang}.pageSlug`] : slug
                    },
                    limit : 99
                };
                const cats     = await ServiceCategories.getCategories(postbody);
                for (const oneCat of cats.datas) {
                    oneCat.translation[oneLang].pageSlug = newSlug;
                    await ServiceCategories.setCategory({body: oneCat});
                }
            }
        }
    }
    return newStatic;
};

const createStatic = async (postBody) => Statics.create(postBody);

const deleteStatic = async (id) => {
    const statics = await Statics.findOne({_id: id});
    if (!statics) throw NSErrors.StaticNotFound;
    const isRemoved = await statics.remove();
    return {status: isRemoved};
};

module.exports = {
    getStatics,
    getStatic,
    getStaticById,
    setStatic,
    createStatic,
    deleteStatic
};