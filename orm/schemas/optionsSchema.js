/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const utilsDatabase = require('../../utils/database');
const Schema        = mongoose.Schema;
const OptionsValue  = new Schema({
    name    : {},
    values  : {type: String},
    control : {
        default : {type: Boolean},
        min     : {type: Number},
        max     : {type: Number}
    },
    modifier : {
        price : {
            value     : {type: Number},
            typePrice : {
                type : String,
                enum : ['pourcent', 'price']
            }
        },
        weight : {type: Number}
    }
}, {
    id : false
});

const OptionsSchema = new Schema({
    code      : {type: String, required: true},
    name      : {},
    mandatory : {type: Boolean, required: true},
    type      : {
        type : String,
        enum : ['textfield', 'bool', 'number', 'list', 'radio', 'color', 'date', 'checkbox', 'productList']
    },
    values : [OptionsValue]
}, {
    id : false
});

OptionsSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('options', that._id, that.code);
};

OptionsSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, OptionsSchema);
});

OptionsSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, OptionsSchema);
});

OptionsSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, OptionsSchema);
});

module.exports = OptionsSchema;