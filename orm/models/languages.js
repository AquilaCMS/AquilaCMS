/**
 * @typedef languages
 * @property {string} code
 * @property {string} name
 * @property {string} img
 * @property {number} position default: 2
 * @property {boolean} defaultLanguage default: false
 * @property {string} status default: invisible
 */

const mongoose = require('mongoose');
const {LanguagesSchema} = require('../schemas');

module.exports = mongoose.model('languages', LanguagesSchema);