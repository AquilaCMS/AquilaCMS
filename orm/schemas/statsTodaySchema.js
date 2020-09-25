const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} StatsTodaySchema
 * @property {array} visit default:[]
 * @property {number} oldCart default:0
 */
const StatsTodaySchema = new Schema({
    visit   : {type: Array, default: []},
    oldCart : {type: Number, default: 0}
});

module.exports = StatsTodaySchema;