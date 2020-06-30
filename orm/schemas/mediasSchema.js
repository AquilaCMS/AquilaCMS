const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const MediasSchema = new Schema({
    name      : String,
    link      : String,
    extension : {type: String, default: ".jpg"}
});

module.exports = MediasSchema;