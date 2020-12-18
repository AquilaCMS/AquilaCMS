/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} ModulesSchema
 * @property {string} name
 * @property {string} description
 * @property {string} version
 * @property {string} path
 * @property {string} url
 * @property {array<string>} cronNames
 * @property {array<string>} mailTypeCode
 * @property {boolean} loadApp default:true
 * @property {boolean} loadTranslationBack default:false
 * @property {boolean} loadTranslationFront default:false
 * @property {array<string>} files
 * @property {string} active default:false
 * @property {object} config default:{}
 * @property {ModulesSchemaPackageDependencies} packageDependencies
 * @property {string} type
 * @property {array<string>} moduleDependencies default:[]
 * @property {string} component_template_front default:null
 */

/**
 * @typedef {object} ModulesSchemaPackageDependencies
 * @property {object} theme default:{}
 * @property {object} api default:{}
 */
const ModulesSchema = new Schema({
    name                 : {type: String, index: true},
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
    type                     : {type: String},
    moduleDependencies       : {type: [String], default: []},
    component_template_front : {type: String, default: null}
});

module.exports = ModulesSchema;