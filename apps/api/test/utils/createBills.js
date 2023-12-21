const faker   = require('faker');
const {Bills} = require('../../orm/models');

const createBills = (params = {id: null, montant: null, facture: null, email: null}) => {
    const {id, montant, facture, email} = params;
    const bill                          = new Bills();
    bill.email                          = email || faker.internet.email();
    bill.facture                        = facture || faker.internet.email();
    bill.montant                        = montant || faker.datatype.number();
    bill.avoir                          = faker.datatype.boolean();
    bill.withTaxes                      = faker.datatype.boolean();
    bill.isPaid                         = faker.datatype.boolean();
    bill.nom                            = faker.name.lastName();
    bill.prenom                         = faker.name.firstName();
    bill.client                         = '5fe301f3ab37321a541ade1b';
    bill.createdAt                      = '2022-12-23T13:56:40.358Z';
    bill.order_id                       = id || '5fe31187ab37321a541ade81';
    return bill.save();
};

const deleteAllBills = async () => {
    await Bills.deleteMany({});
};

module.exports = {
    createBills,
    deleteAllBills
};
