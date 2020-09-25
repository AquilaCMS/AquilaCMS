const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} MediasSchema
 * @property {string} name
 * @property {string} link
 * @property {string} group default:
 * @property {string} extension default:.jpg
 */
const MediasSchema = new Schema({
    name      : String,
    link      : String,
    group     : {type: String, default: ''},
    extension : {type: String, default: '.jpg'}
});

module.exports = MediasSchema;