const mongoose              = require('mongoose');
const {ProductBundleSchema} = require('.');
const Schema                = mongoose.Schema;

const ProductBundlePreviewSchema = new Schema(ProductBundleSchema);

module.exports = ProductBundlePreviewSchema;