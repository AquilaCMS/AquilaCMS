const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} CompanySchema
 * @property {string} name
 * @property {string} siret
 * @property {string} intracom
 * @property {string} address
 * @property {string} postal_code
 * @property {string} town
 * @property {string} country
 * @property {CompanySchemaContact} contact
 */

/**
 * @typedef {object} CompanySchemaContact
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} email
 * @property {string} phone
 */

const CompanySchema = new Schema({
    name        : String,
    siret       : String,
    intracom    : String,
    address     : String,
    postal_code : String,
    town        : String,
    country     : String,
    contact     : {
        first_name : String,
        last_name  : String,
        email      : String,
        phone      : String
    }
});

module.exports = CompanySchema;