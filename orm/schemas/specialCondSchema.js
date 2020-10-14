const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const SpecialCondSchema = new Schema({
    price     : {type: Number},
    priceType : {type: String},
    supplier  : {type: String},
    startDate : {type: Number},
    endDate   : {type: Number},
    active    : {type: String},
    product   : {type: String},
    user      : {type: String}
});

SpecialCondSchema.index(
    {supplier: 1, startDate: 1, endDate: 1, product: 1, user: 1},
    {name: 'specialCond', unique: true}
);

module.exports = SpecialCondSchema;