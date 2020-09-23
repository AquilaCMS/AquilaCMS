const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
const ObjectId = Schema.ObjectId;

/**
 * @typedef {object} TerritorySchema
 * @property {object} translation
 * @property {string} code.required - ex: FR
 * @property {string} type - type - enum:country,district,department,city
 * @property {boolean} taxeFree
 * @property {array<string>} children - ex: ["5ce622d540966ec57f46e74e"]
 */

const TerritorySchema = new Schema({
    translation : {},
    code        : {type: String, required: true, index: true},
    type        : {type: String, enum: ['country', 'district', 'department', 'city']},
    taxeFree    : Boolean,
    children    : [{type: ObjectId, ref: 'territory'}]
});

TerritorySchema.index({code: 1, name: 1}, {unique: true});
TerritorySchema.index({name: 1, type: 1});
TerritorySchema.index({code: 1, type: 1});

module.exports = TerritorySchema;