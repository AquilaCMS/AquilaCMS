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
    require('../../utils/aquilaEvents').emit('aqNewPreviewArticle', doc);
});

module.exports = NewsPreviewSchema;