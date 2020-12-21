/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const SequencesSchema = new Schema({
    name : {type: String, required: true, unique: true},
    seq  : {type: Number, required: true, default: 0}
});

SequencesSchema.statics.getNextSequence = function (name, cb) {
    this.findOneAndUpdate(
        {name},
        {$inc: {seq: 1}},
        {upsert: true, new: true},
        cb
    );
};

module.exports = SequencesSchema;