const mongoose = require('mongoose');
const Statics  = require('./staticsSchema');
const utilsDatabase = require('../../utils/database');
const Schema   = mongoose.Schema;

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
    this.modifyDate = new Date();
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

module.exports = StaticsPreviewSchema;