/**
 * @typedef Shortcodes
 * @property {String} tag.required
 */

const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;
const aquilaEvents = require('../../utils/aquilaEvents');

const ShortcodesSchema = new Schema({
    tag         : {type: String, required: true, unique: true},
    weight      : Number,
    translation : {}
}, {timestamps: true});

module.exports = ShortcodesSchema;
aquilaEvents.emit('ShortcodesSchemaInit', ShortcodesSchema);