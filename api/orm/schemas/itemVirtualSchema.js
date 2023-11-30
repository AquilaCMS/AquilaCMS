/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const ItemVirtual = new Schema({
    downloadInfos : {type: String},
    filename      : {type: String},
    stock         : {
        qty        : {type: Number, default: 0},
        qty_booked : {type: Number, default: 0}
    }
}, {
    discriminatorKey : 'type',
    id               : false
});

ItemVirtual.methods.populateItem = async function () {
    const {Products} = require('../models');
    const self       = this;
    if (self.id._id === undefined) self.id = await Products.findById(self.id);
};

module.exports = ItemVirtual;