const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const DeliveryMethodSchema = new Schema({
    countries : [
        {
            isoCode : {type: String},
            name    : {type: String}
        }
    ]
});

module.exports = DeliveryMethodSchema;