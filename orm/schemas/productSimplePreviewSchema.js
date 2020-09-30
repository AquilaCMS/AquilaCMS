const mongoose              = require('mongoose');
const {ProductSimpleSchema} = require('.');
const Schema                = mongoose.Schema;

const ProductSimplePreviewSchema = new Schema(ProductSimpleSchema);

module.exports = ProductSimplePreviewSchema;