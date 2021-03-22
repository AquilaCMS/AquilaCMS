const faker       = require('faker');
const {Suppliers} = require('../../orm/models');

const createSuppliers = (params = {code: null, name: null}) => {
    const {code, name} = params;
    const suppliers    = new Suppliers();
    suppliers.code     = code || faker.lorem.slug();
    suppliers.name     = name || faker.name.title();
    return suppliers.save();
};

const deleteAllSuppliers = async () => {
    await Suppliers.deleteMany({});
};

module.exports = {
    createSuppliers,
    deleteAllSuppliers
};