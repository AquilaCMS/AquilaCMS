const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const NewslettersSchema = new Schema({
    _id     : {type: Schema.ObjectId, auto: true},
    email   : {type: String, required: true, unique: true},
    segment : [{
        name             : {type: String, index: true},
        optin            : {type: Boolean},
        date_subscribe   : {type: Date, default: Date.now},
        date_unsubscribe : {type: Date}
    }]
});

module.exports = NewslettersSchema;