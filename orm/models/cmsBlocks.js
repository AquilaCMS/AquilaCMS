const mongoose = require('mongoose');
const {CmsBlocksSchema} = require('../schemas');

module.exports = mongoose.model('cmsBlocks', CmsBlocksSchema);