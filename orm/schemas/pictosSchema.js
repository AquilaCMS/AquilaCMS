const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const PictosSchema = new Schema({
    _id           : {type: Schema.ObjectId, auto: true},
    code          : {type: String, required: true, unique: true},
    filename      : {type: String},
    title         : {type: String},
    location      : {type: String}, // Lieux d'affichage du picto sur l'image du produit...
    enabled       : {type: Boolean, default: false},
    usedInFilters : {type: Boolean, default: false}
});

module.exports = PictosSchema;