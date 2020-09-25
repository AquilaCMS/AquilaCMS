const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} PictosSchema
 * @property {string} _id ObjectId
 * @property {string} code.required
 * @property {string} filename
 * @property {string} title
 * @property {string} location
 * @property {string} enabled default:false
 * @property {string} usedInFilters default:false
 */
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