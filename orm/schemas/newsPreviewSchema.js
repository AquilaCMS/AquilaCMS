/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const News          = require('./newsSchema');
const utilsDatabase = require('../../utils/database');
const Schema        = mongoose.Schema;

/**
 * @typedef {NewsSchema} NewsPreviewSchema
 */
const NewsPreviewSchema   = new Schema(News);
NewsPreviewSchema.statics = News.statics;

NewsPreviewSchema.pre('updateOne', async function (next) {
    utilsDatabase.preUpdates(this, next, NewsPreviewSchema);
});

NewsPreviewSchema.pre('findOneAndUpdate', async function (next) {
    utilsDatabase.preUpdates(this, next, NewsPreviewSchema);
});

NewsPreviewSchema.pre('save', async function (next) {
    const errors = await NewsPreviewSchema.statics.translationValidation(undefined, this);
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

NewsPreviewSchema.post('save', async function (doc) {
    const {aquilaEvents} = require('aql-utils');
    aquilaEvents.emit('aqNewPreviewArticle', doc);
});

module.exports = NewsPreviewSchema;