const faker   = require('faker');
const {Promo} = require('../../orm/models');

const createPromo = (params = {name: null, desc: null}) => {
    const {name, desc}   = params;
    const promo          = new Promo();
    promo.actif          = false;
    promo.applyNextRules = false;
    promo.codes          = [];
    promo.dateEnd        = null;
    promo.dateStart      = null;
    promo.description    = desc || faker.lorem.sentence();
    promo.discountType   = null;
    promo.discountValue  = 0;
    promo.gifts          = [];
    promo.name           = name || faker.lorem.slug();
    promo.priority       = 0;
    promo.type           = '1';
    return promo.save();
};

const deleteAllPromo = async () => {
    await Promo.deleteMany({});
};

module.exports = {
    createPromo,
    deleteAllPromo
};