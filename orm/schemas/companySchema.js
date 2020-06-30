const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

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