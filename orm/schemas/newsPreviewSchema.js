/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose       = require('mongoose');
const {aquilaEvents} = require('aql-utils');
const News           = require('./newsSchema');
const utilsDatabase  = require('../../utils/database');
const Schema         = mongoose.Schema;

/**
 * @typedef {NewsSchema} NewsPreviewSchema
 */
const NewsPreviewSchema   = new Schema(News);
NewsPreviewSchema.statics = News.statics;

NewsPreviewSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, NewsPreviewSchema);
});

NewsPreviewSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, NewsPreviewSchema);
});

NewsPreviewSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, NewsPreviewSchema);
});

NewsPreviewSchema.post('save', async function (doc) {
    aquilaEvents.emit('aqNewPreviewArticle', doc);
});

module.exports = NewsPreviewSchema;