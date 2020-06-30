const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const SetAttributesSchema = new Schema({
    code       : {type: String, required: true, unique: true},
    name       : {type: String, required: true},
    attributes : [{type: ObjectId, ref: 'attributes'}],
    type       : {
        type : String,
        enum : ['products', 'users']
    },
    questions : [{
        translation : {}
    }]
});

module.exports = SetAttributesSchema;