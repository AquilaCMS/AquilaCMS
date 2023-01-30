/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const ModulesSchema = new Schema({
    name                 : {type: String, index: true, unique: true},
    description          : {type: String},
    version              : {type: String},
    path                 : {type: String},
    url                  : {type: String},
    cronNames            : [String],
    mailTypeCode         : [String],
    loadApp              : {type: Boolean, default: true},
    loadTranslationBack  : {type: Boolean, default: false},
    loadTranslationFront : {type: Boolean, default: false},
    files                : [String],
    active               : {type: Boolean, default: false},
    config               : {type: Object, default: {}},
    packageDependencies  : {
        theme : {type: {}, default: {}},
        api   : {type: {}, default: {}}
    },
    type  : {type: String},
    types : [{
        component : {type: String},
        type      : {type: String}
    }],
    moduleDependencies       : {type: [String], default: []},
    component_template_front : {type: String, default: null}
}, {
    id : false
});

module.exports = ModulesSchema;