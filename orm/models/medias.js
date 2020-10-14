const mongoose       = require('mongoose');
const {MediasSchema} = require('../schemas');

module.exports = mongoose.model('medias', MediasSchema);