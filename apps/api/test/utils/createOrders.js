const faker    = require('faker');
const {Orders} = require('../../orm/models');

const createOrders = (params = {price: null, email: null, number: null}) => {
    const {price, email, number} = params;
    const order                  = new Orders();
    order.id                     = faker.datatype.number();
    order.number                 = number || 'W0000053';
    order.customer               = {
        email : email || faker.internet.email()
    };
    order.priceTotal             = {
        ati : price || faker.datatype.number()
    };
    order.cartId                 = '605a00d6da731e386c38312e';
    order.lang                   = 'fr';
    return order.save();
};

const deleteAllOrders = async () => {
    await Orders.deleteMany({});
};

module.exports = {
    createOrders,
    deleteAllOrders
};