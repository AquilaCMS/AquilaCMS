const faker   = require('faker');
const {Promo} = require('../../orm/models');

const createPromo = (params = {name: null, desc: null}) => {
    const {
        name,
        desc,
        dateEnd,
        dateStart,
        actif,
        discountType,
        discountValue,
        type,
        codepromo
    } = params;
    const promo          = new Promo();
    promo.actif          = actif || false;
    promo.applyNextRules = false;
    promo.codes          = [{
        code         : codepromo || 'promo',
        limit_client : null,
        limit_total  : null
    }];
    promo.dateEnd        = dateEnd || null;
    promo.dateStart      = dateStart || null;
    promo.description    = desc || faker.lorem.sentence();
    promo.discountType   = discountType || null;
    promo.discountValue  = discountValue || 0;
    promo.gifts          = [];
    promo.name           = name || faker.lorem.slug();
    promo.priority       = 1;
    promo.type           = type || '1';
    return promo.save();
};

const deleteAllPromo = async () => {
    await Promo.deleteMany({});
};

module.exports = {
    createPromo,
    deleteAllPromo
};