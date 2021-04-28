/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const NSErrors = require('../../utils/errors/NSErrors');
const Schema   = mongoose.Schema;

const MediasSchema = new Schema({
    name      : String,
    link      : String,
    group     : {type: String, default: ''},
    extension : {type: String, default: '.jpg'}
});

async function preUpdates(that) {
    if (!that.name) {
        return;
    }
    const query = {name: that.name};
    if (that._id) {
        query._id = {$ne: that._id};
    }
    if (await mongoose.model('medias').exists(query)) {
        throw NSErrors.CodeExisting;
    }
    // here it is that.name because that.code does not exist
}

MediasSchema.pre('updateOne', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

MediasSchema.pre('findOneAndUpdate', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

MediasSchema.pre('save', async function (next) {
    await preUpdates(this);
    next();
});

module.exports = MediasSchema;