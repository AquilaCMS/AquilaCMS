const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const ThemeConfigSchema = new Schema({
    name   : String,
    config : {}
});

module.exports = ThemeConfigSchema;