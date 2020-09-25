const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
const helper   = require('../../utils/utils');

/**
 * @typedef {object} LanguagesSchema
 * @property {string} code.required
 * @property {string} name.required
 * @property {string} img
 * @property {string} position default:1
 * @property {string} defaultLanguage default:false
 * @property {string} status enum:visible,invisible,removing - default:invisible
 */
const LanguagesSchema = new Schema({
    code            : {type: String, required: true, unique: true},
    name            : {type: String, required: true, unique: true},
    img             : {type: String},
    position        : {type: Number, default: 1},
    defaultLanguage : {type: Boolean, default: false},
    status          : {type: String, enum: ['visible', 'invisible', 'removing'], default: 'invisible'}
});

LanguagesSchema.pre('save', function (next) {
    this.code = helper.slugify(this.code);
    next();
});

module.exports = LanguagesSchema;