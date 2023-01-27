/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose       = require('mongoose');
const {aquilaEvents} = require('aql-utils');
const Schema         = mongoose.Schema;

const AdmininformationSchema = new Schema({
    code        : {type: String},
    type        : {type: String, enum: ['success', 'info', 'warning', 'danger']},
    translation : {},
    date        : {type: Date},
    deleted     : {type: Boolean}
}, {
    id : false
});

aquilaEvents.emit('admininformationSchemaInit', AdmininformationSchema);

module.exports = AdmininformationSchema;