const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

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
    {name: "specialCond", unique: true}
);

module.exports = SpecialCondSchema;