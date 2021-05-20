const faker      = require('faker');
const {Products} = require('../../orm/models');

const createProduct = (params = {code: null, name: null}) => {
    const {code, name}      = params;
    const product           = new Products();
    product.active          = false;
    product.associated_prds = [];
    product.attributes      = [];
    product.autoSlug        = true;
    product.characteristics = [];
    product.code            = code || faker.lorem.slug();
    product.images          = [];
    product.type            = 'simple';
    product._visible        = false;
    product.price           = {
        purchase : 0,
        et       : {
            normal : 0
        },
        ati : {
            normal : 0
        },
        tax : 0
    };
    product.set_attributes  = {
        _id  : '5c5abe92c1f87b5f46c451fa',
        code : 'defaut',
        name : 'Défaut'
    };
    product.stock           = {
        qty        : 0,
        qty_booked : 0
    };
    product.translation     = {
        fr : {
            name : name || faker.lorem.slug()
        }
    };
    return product.save();
};

const deleteAllProducts = async () => {
    await Products.deleteMany({});
};

module.exports = {
    createProduct,
    deleteAllProducts
};