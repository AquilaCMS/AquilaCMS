const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
const ObjectId = Schema.ObjectId;

/**
 * @typedef {objet} SetOptionsSchema
 * @property {string} code.required
 * @property {string} name.required
 * @property {array<string>} opts opts ObjectId
 */
const SetOptionsSchema = new Schema({
    code : {type: String, required: true, unique: true},
    name : {type: String, required: true},
    opts : [{type: ObjectId, ref: 'opts'}]
});

module.exports = SetOptionsSchema;