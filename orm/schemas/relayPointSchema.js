const mongoose         = require('mongoose');
const Schema           = mongoose.Schema;
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