const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const StatsHistorySchema = new Schema({
    visit   : {type: Array, default: []},
    oldCart : {type: Array, default: []}
});

module.exports = StatsHistorySchema;