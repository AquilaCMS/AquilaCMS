/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose   = require('mongoose');
const Schema     = mongoose.Schema;
const {ObjectId} = Schema.Types;

const RulesSchema = new Schema({
    owner_id   : {type: ObjectId, required: true},
    owner_type : {type: String, required: true},
    operand    : {type: String, required: true},
    conditions : [
        {
            target                : {type: String, required: true},
            type                  : {type: String, required: true},
            operator              : {type: String, required: true},
            value                 : {type: Schema.Types.Mixed, required: true},
            id_parent_other_rules : {type: String} // une other_rules pourra faire reference a id_parent_other_rules afin d'indiquer son appartenance a cette condition
        }
    ],
    effects : [
        {
            qty   : {type: Number, required: true},
            type  : {type: String, required: true},
            value : {type: Number, required: true}
        }
    ]
}, {
    id : false
});

RulesSchema.add({
    other_rules : [RulesSchema]
});

RulesSchema.pre('save', function (next) {
    next();
});

module.exports = RulesSchema;