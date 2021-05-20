/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const Schema        = mongoose.Schema;
const utilsDatabase = require('../../utils/database');
/**
 * schema d'une gallerie photo et/ou video
 */
const GallerySchema = new Schema({
    code            : {type: String, required: true, unique: true},
    initItemNumber  : {type: Number, default: 6, required: true},
    maxColumnNumber : {type: Number, default: 3, required: true},
    items           : [{
        _itemId   : Schema.Types.ObjectId,
        src       : {type: String, trim: true, default: ''},
        srcset    : [{type: String, trim: true}],
        sizes     : [{type: String, trim: true}],
        content   : {type: String, trim: true, default: ''}, // IDyoutube
        alt       : {type: String, default: ''},
        order     : {type: Number, default: 0},
        extension : {type: String, default: '.jpg'}
    }]
}, {
    timestamps : true,
    id         : false
});

async function preUpdates(that) {
    await utilsDatabase.checkCode('gallery', that._id, that.code);
}

GallerySchema.pre('findOneAndUpdate', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

GallerySchema.pre('updateOne', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

GallerySchema.pre('save', async function (next) {
    await preUpdates(this);
    next();
});

module.exports = GallerySchema;