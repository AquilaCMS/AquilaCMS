// const faker   = require('faker');
const {Cart} = require('../../orm/models');

const createCart = (params) => {
    const {items, cartId} = params;
    const cart            = new Cart();
    cart.cartId           = cartId || null;
    cart.items            = items || {};
    return cart.save();
};

const deleteAllCart = async () => {
    await Cart.deleteMany({});
};

module.exports = {
    createCart,
    deleteAllCart
};