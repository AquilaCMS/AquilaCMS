/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

// staticsPreview
const URL          = require('url');
const ModelPreview = require('../orm/models/staticsPreview');
const QueryBuilder = require('../utils/QueryBuilder');

const restrictedFields              = [];
const defaultFields                 = ['_id', 'code', 'translation'];
const queryBuilder                  = new QueryBuilder(ModelPreview, restrictedFields, defaultFields);
const {StaticsPreview, NewsPreview} = require('../orm/models');

const getStaticsPreview = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const getStaticPreview = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const getStaticPreviewById = async (_id) => {
    return getStaticPreview({filter: {_id}});
};

const deletePreview = async (code) => {
    return ModelPreview.deleteOne({code});
};

// Blog preview

const getNewsPreview = async (PostBody) => {
    return NewsPreview.find(PostBody.filter).populate(PostBody.populate).sort(PostBody.sort).limit(PostBody.limit || 1);
};

const getNewPreview = async (PostBody) => {
    return NewsPreview.findOne(PostBody.filter).populate(PostBody.populate);
};

const getNewPreviewById = async (_id) => {
    return getNewPreview({filter: {_id}});
};

const deleteNewPreview = async (code) => {
    return NewsPreview.deleteOne({code});
};

// productPreview

const {
    ProductsPreview,
    ProductSimplePreview,
    ProductBundlePreview,
    ProductVirtualPreview
}                             = require('../orm/models');

const preview = async (body) => {
    let preview = {};
    if (await ProductsPreview.findOne({code: body.code})) {
        body.updatedAt = new Date();
        preview        = await ProductsPreview.findOneAndUpdate({code: body.code}, body, {new: true});
    } else {
        let newPreview;
        switch (body.type) {
        case 'simple':
            newPreview           = new ProductSimplePreview(body);
            newPreview.kind      = 'SimpleProductPreview';
            newPreview.updatedAt = new Date(); // updateAt n'est pas mis a jour
            preview              = await newPreview.save();
            break;
        case 'bundle':
            newPreview           = new ProductBundlePreview(body);
            newPreview.kind      = 'BundleProductPreview';
            newPreview.updatedAt = new Date(); // updateAt n'est pas mis a jour
            preview              = await newPreview.save();
            break;
        case 'virtual':
            newPreview           = new ProductVirtualPreview(body);
            newPreview.kind      = 'VirtualProductPreview';
            newPreview.updatedAt = new Date(); // updateAt n'est pas mis a jour
            preview              = await newPreview.save();
            break;
        default:
            break;
        }
    }
    if (body.lang) {
        return URL.resolve(global.envConfig.environment.appUrl, `${preview.translation[body.lang].canonical}?preview=${preview._id}`);
    }
    const lang = await require('../orm/models/languages').findOne({defaultLanguage: true});
    return URL.resolve(global.envConfig.environment.appUrl, `${preview.translation[lang ? lang.code : Object.keys(preview.translation)[0]].canonical}?preview=${preview._id}`);
};

/**
 * remove all products or statics previews that are older of more that 1 day
 */
const removePreviews = async () => {
    try {
        const date = new Date();
        await StaticsPreview.deleteMany({updatedAt: {$lte: date.setDate(date.getDate() - 1)}});
        await ProductsPreview.deleteMany({updatedAt: {$lte: date.setDate(date.getDate() - 1)}});
    } catch (err) {
        console.error(err);
    }
};

module.exports = {
    getStaticsPreview,
    getStaticPreview,
    getStaticPreviewById,
    deletePreview,
    preview,
    removePreviews,
    getNewsPreview,
    getNewPreview,
    getNewPreviewById,
    deleteNewPreview

};
