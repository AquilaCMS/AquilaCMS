const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} SpecialCondSchema
 * @property {number} price
 * @property {string} priceType
 * @property {string} supplier
 * @property {number} startDate
 * @property {number} endDate
 * @property {string} active
 * @property {string} product
 * @property {string} user
 */
const SpecialCondSchema = new Schema({
    price     : Number,
    priceType : String,
    supplier  : String,
    startDate : Number,
    endDate   : Number,
    active    : String,
    product   : String,
    user      : String
});

SpecialCondSchema.index(
    {supplier: 1, startDate: 1, endDate: 1, product: 1, user: 1},
    {name: 'specialCond', unique: true}
);

module.exports = SpecialCondSchema;