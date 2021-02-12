const cart = require('./cart.json');
const category = require('./category.json');

module.exports = {
    ...cart,
    ...category
};