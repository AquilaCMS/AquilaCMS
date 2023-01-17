/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const ItemVirtual = new Schema({}, {
    discriminatorKey : 'type',
    id               : false
});

ItemVirtual.methods.populateItem = async function () {
    const {Products} = require('../models');
    const self       = this;
    if (self.id._id === undefined) self.id = await Products.findById(self.id);
};

module.exports = ItemVirtual;