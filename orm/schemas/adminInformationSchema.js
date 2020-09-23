const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} AdmininformationSchema
 * @property {string} code
 * @property {string} type - enum:success,info,warning,danger
 * @property {object} translation
 * @property {string} date - Date
 * @property {boolean} deleted
 */

const AdmininformationSchema = new Schema({
    code        : {type: String},
    type        : {type: String, enum: ['success', 'info', 'warning', 'danger']},
    translation : {},
    date        : {type: Date},
    deleted     : {type: Boolean}
});

module.exports = AdmininformationSchema;