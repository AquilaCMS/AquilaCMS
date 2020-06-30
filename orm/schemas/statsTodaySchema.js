const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const StatsTodaySchema = new Schema({
    visit   : {type: Array, default: []},
    oldCart : {type: Number, default: 0}
});

module.exports = StatsTodaySchema;