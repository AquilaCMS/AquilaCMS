const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const RulesSchema = new Schema({
    owner_id   : {type: ObjectId, required: true},
    owner_type : {type: String, required: true},
    operand    : {type: String, required: true},
    conditions : [
        {
            target                : {type: String, required: true},
            type                  : {type: String, required: true},
            operator              : {type: String, required: true},
            value                 : {type: String, required: true},
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
});

RulesSchema.add({
    other_rules : [RulesSchema]
});

RulesSchema.pre('save', function (next) {
    next();
});

module.exports = RulesSchema;