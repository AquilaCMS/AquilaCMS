const mongoose     = require('mongoose');
const aquilaEvents = require('../../utils/aquilaEvents');
const Schema       = mongoose.Schema;

/**
 * @typedef {object} AddressSchema
 * @property {string} firstname.required
 * @property {string} lastname.required
 * @property {string} companyName
 * @property {string} phone
 * @property {string} phone_mobile
 * @property {string} line1.required
 * @property {string} line2
 * @property {string} zipcode.required
 * @property {string} city.required
 * @property {string} isoCountryCode.required
 * @property {string} country.required
 * @property {string} complementaryInfo
 * @property {string} civility - 0 pour homme, 1 pour femme - enum:0,1
 */
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

aquilaEvents.emit('addressSchemaInit', AddressSchema);

module.exports = AddressSchema;