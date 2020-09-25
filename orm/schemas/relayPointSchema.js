const mongoose         = require('mongoose');
const Schema           = mongoose.Schema;

/**
 * @typedef {object} RelayPointSchema
 * @property {RelayPointSchemaAddress} address
 */

/**
 * @typedef {object} RelayPointSchemaAddress
 * @property {string} name
 * @property {string} line1
 * @property {string} line2
 * @property {string} zipcode
 * @property {string} city
 * @property {string} isoCountryCode
 * @property {string} country
 */
const RelayPointSchema = new Schema({
    address : {
        name           : String,
        line1          : String,
        line2          : String,
        zipcode        : String,
        city           : String,
        isoCountryCode : String,
        country        : String
    }
});

module.exports = RelayPointSchema;