const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const AddressSchema = new Schema({
    firstname         : {type: String, require: true},
    lastname          : {type: String, require: true},
    companyName       : {type: String},
    phone             : {type: String},
    phone_mobile      : {type: String},
    line1             : {type: String, require: true},
    line2             : {type: String},
    zipcode           : {type: String, require: true},
    city              : {type: String, require: true},
    isoCountryCode    : {type: String, require: true},
    country           : {type: String, require: true},
    complementaryInfo : {type: String},
    civility          : {type: Number, enum: [0, 1]} // 0 pour homme, 1 pour femme
});

module.exports = AddressSchema;