const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const SetOptionsSchema = new Schema({
    code : {type: String, required: true, unique: true},
    name : {type: String, required: true},
    opts : [{type: ObjectId, ref: 'opts'}]
});

module.exports = SetOptionsSchema;