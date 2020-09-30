const mongoose               = require('mongoose');
const {ProductVirtualSchema} = require('.');
const Schema                 = mongoose.Schema;

const ProductVirtualPreviewSchema = new Schema(ProductVirtualSchema);

module.exports = ProductVirtualPreviewSchema;