const Shipments = require('./shipments');
const {RelayPointSchema} = require("../schemas");

module.exports = Shipments.discriminator('RELAY_POINT', RelayPointSchema, {discriminatorKey: 'type'});