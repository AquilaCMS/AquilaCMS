const faker       = require('faker');
const {Shipments} = require('../../orm/models');

const createShipments = (params = {code: null, name: null}) => {
    const {name, code}   = params;
    const shipment       = new Shipments();
    shipment.type        = 'DELIVERY';
    shipment.code        = code || faker.lorem.slug();
    shipment.countries   = [];
    shipment.translation = {
        fr : {
            name : name || faker.name.title()
        }
    };
    return shipment.save();
};

const deleteAllShipments = async () => {
    await Shipments.deleteMany({});
};

module.exports = {
    createShipments,
    deleteAllShipments
};
