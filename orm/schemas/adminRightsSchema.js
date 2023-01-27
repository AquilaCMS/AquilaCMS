/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose       = require('mongoose');
const {aquilaEvents} = require('aql-utils');
const utilsDatabase  = require('../../utils/database');
const Schema         = mongoose.Schema;

const AdminRightsSchema = new Schema({
    code      : {type: String, unique: true},
    translate : {}
}, {
    id : false
});

/* translation:
 name
 */

AdminRightsSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, AdminRightsSchema);
});

AdminRightsSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, AdminRightsSchema);
});

AdminRightsSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, AdminRightsSchema);
});

AdminRightsSchema.post('save', async function (doc) {
    aquilaEvents.emit('aqNewAdminRights', doc);
});

aquilaEvents.emit('adminRightsSchemaInit', AdminRightsSchema);

module.exports = AdminRightsSchema;