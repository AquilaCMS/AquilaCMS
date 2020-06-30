const Products               = require("./products");
const {ProductVirtualSchema} = require("../schemas");

module.exports = Products.discriminator('VirtualProduct', ProductVirtualSchema);
