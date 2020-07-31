const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const MediasSchema = new Schema({
    name      : String,
    link      : String,
    group     : {type: String, default: 'general'},
    extension : {type: String, default: '.jpg'}
});

module.exports = MediasSchema;