/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/**
 * @typedef Shortcodes
 * @property {String} tag.required
 */

const mongoose       = require('mongoose');
const {aquilaEvents} = require('aql-utils');
const Schema         = mongoose.Schema;

const ShortcodesSchema = new Schema({
    tag         : {type: String, required: true, unique: true},
    weight      : Number,
    translation : {}
}, {
    timestamps : true,
    id         : false
});

module.exports = ShortcodesSchema;
aquilaEvents.emit('ShortcodesSchemaInit', ShortcodesSchema);