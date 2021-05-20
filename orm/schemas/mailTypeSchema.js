/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const MailTypeSchema = new Schema({
    code        : {type: String, unique: true, sparse: true},
    name        : {type: String, required: true},
    position    : {type: Number, default: 1},
    translation : {}
}, {
    timestamps : true,
    id         : false
});

MailTypeSchema.pre('validate', function (next) {
    if (this.code === undefined || this.code == null || (this.code === '' && this.name !== 'Aucun type')) {
        next(new Error('mailtype.code is empty'));
    }
    next();
});

module.exports = MailTypeSchema;