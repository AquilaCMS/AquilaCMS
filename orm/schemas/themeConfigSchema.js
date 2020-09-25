const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} ThemeConfigSchema
 * @property {string} name
 * @property {object} config
 */
const ThemeConfigSchema = new Schema({
    name   : String,
    config : {}
});

module.exports = ThemeConfigSchema;