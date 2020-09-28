const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} StatsHistorySchema
 * @property {object[]} visit default:[]
 * @property {object[]} oldCart default:[]
 */
const StatsHistorySchema = new Schema({
    visit   : {type: Array, default: []},
    oldCart : {type: Array, default: []}
});

module.exports = StatsHistorySchema;