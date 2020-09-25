const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} DeliveryMethodSchema
 * @property {array<DeliveryMethodSchemaCountries>} countries
 */

/**
 * @typedef {object} DeliveryMethodSchemaCountries
 * @property {string} isoCode
 * @property {string} name
 */
const DeliveryMethodSchema = new Schema({
    countries : [
        {
            isoCode : {type: String},
            name    : {type: String}
        }
    ]
});

module.exports = DeliveryMethodSchema;