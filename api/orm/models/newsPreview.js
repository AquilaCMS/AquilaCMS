const mongoose            = require('mongoose');
const {NewsPreviewSchema} = require('../schemas');

module.exports = mongoose.model('newsPreview', NewsPreviewSchema);