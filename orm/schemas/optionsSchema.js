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

const SetAttributesSchema = new Schema({
    code : {type: String, required: true, unique: true},
    type : {
        type : String,
        enum : ['textfield', 'bool', 'number', 'list', 'radio', 'color', 'date', 'productList']
    },
    values : [{
        value   : {},
        control : {
            checked   : {type: Boolean, required: true},
            mandatory : {type: Boolean, required: true},
            min       : {type: Number},
            max       : {type: Number}
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
    }]

}, {
    id : false
});

SetAttributesSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('setAttributes', that._id, that.code);
};

SetAttributesSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, SetAttributesSchema);
});

SetAttributesSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, SetAttributesSchema);
});

SetAttributesSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, SetAttributesSchema);
});

module.exports = SetAttributesSchema;