/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const Statics       = require('./staticsSchema');
const utilsDatabase = require('../../utils/database');
const Schema        = mongoose.Schema;

/**
 * @typedef {StaticsSchema} StaticsPreviewSchema
 */
const StaticsPreviewSchema   = new Schema(Statics);
StaticsPreviewSchema.statics = Statics.statics;

StaticsPreviewSchema.pre('updateOne', async function (next) {
    utilsDatabase.preUpdates(this, next, StaticsPreviewSchema);
});

StaticsPreviewSchema.pre('findOneAndUpdate', async function (next) {
    utilsDatabase.preUpdates(this, next, StaticsPreviewSchema);
});

StaticsPreviewSchema.pre('save', async function (next) {
    const errors = await StaticsPreviewSchema.statics.translationValidation(undefined, this);
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

module.exports = StaticsPreviewSchema;