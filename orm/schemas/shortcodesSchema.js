/**
 * @typedef Shortcodes
 * @property {String} tag.required
 */

const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;
const aquilaEvents = require('../../utils/aquilaEvents');
/**
 * @typedef {object} ShortcodesSchema
 * @property {string} tag.required
 * @property {number} weight
 * @property {object} translation
 */
const ShortcodesSchema = new Schema({
    tag         : {type: String, required: true, unique: true},
    weight      : Number,
    translation : {}
}, {timestamps: true});

module.exports = ShortcodesSchema;
aquilaEvents.emit('ShortcodesSchemaInit', ShortcodesSchema);