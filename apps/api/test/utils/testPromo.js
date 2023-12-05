const moment                             = require('moment');
const chai                               = require('chai');
const {createPromo, deleteAllPromo}      = require('./createPromo');
const {createCart, deleteAllCart}        = require('./createCart');
const {createProduct, deleteAllProducts} = require('./createProduct');

const testPromo = async (app, params) => {
    const {dateStart, dateEnd, productValue, promoValue} = params;
    const start                                          = typeof dateStart !== 'undefined' ? dateStart : moment().subtract(2, 'days').toISOString();
    const end                                            = typeof dateEnd !== 'undefined' ? dateEnd : moment().add(2, 'days').toISOString();
    const codepromo                                      = 'codepromo';
    // we create the promo
    await createPromo({
        dateStart     : start,
        dateEnd       : end,
        actif         : true,
        discountType  : 'Aati',
        discountValue : promoValue || 5,
        codepromo
    });
    // we create the product
    const prd = await createProduct({ati: productValue || 15});
    // we create the promo
    const resPrd  = await chai.request(app)
        .post('/api/v2/product')
        .send({PostBody: {filter: {_id: prd._id}, limit: 99}});
    const resCart = await createCart({
        cartId : null,
        items  : [
            {
                ...resPrd.body,
                slug  : resPrd.body.slug.fr || resPrd.body.slug.en,
                price : {
                    ...resPrd.body.price,
                    unit : {
                        ati : resPrd.body.price.ati.normal,
                        et  : resPrd.body.price.ati.normal - 2
                    },
                    vat : {
                        rate : 20
                    }
                },
                id       : resPrd.body._id,
                quantity : 1
            }
        ]
    });
    const resPrd2 = await chai.request(app)
        .get(`/api/v2/promo/check/code/${codepromo}/${resCart._id}`);
    return resPrd2.body.priceTotal.ati;
};

const deleteAllTestPromo = async () => {
    await deleteAllPromo();
    await deleteAllCart();
    await deleteAllProducts();
};

module.exports = {
    testPromo,
    deleteAllTestPromo
};