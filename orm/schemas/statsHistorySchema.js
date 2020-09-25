const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} StatsHistorySchema
 * @property {array} visit default:[]
 * @property {array} oldCart default:[]
 */
const StatsHistorySchema = new Schema({
    visit   : {type: Array, default: []},
    oldCart : {type: Array, default: []}
});

module.exports = StatsHistorySchema;