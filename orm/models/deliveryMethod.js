const Shipment = require("./shipments");
const {DeliveryMethodSchema} = require("../schemas");

module.exports = Shipment.discriminator("DELIVERY", DeliveryMethodSchema, {discriminatorKey: "type"});