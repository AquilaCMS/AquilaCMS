const Products = require("./products");
const {ProductBundleSchema} = require("../schemas");

module.exports = Products.discriminator('BundleProduct', ProductBundleSchema);
