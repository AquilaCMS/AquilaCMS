const chai     = require('chai');
const chaiHttp = require('chai-http');
// const faker                         = require('faker');
const moment = require('moment');
const app    = require('../server');
// const createUserAdminAndLogin         = require('./utils/createUserAdminAndLogin');
const {testPromo, deleteAllTestPromo} = require('./utils/testPromo');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

// let credentials;

describe('Promo Application', () => {
    beforeEach(async () => {
        await deleteAllTestPromo();
        // credentials = await createUserAdminAndLogin();
    });

    describe('Test Promos', () => {
        it('Promo date-4days <=> date-2days (promo not applied)', async () => {
            const dateStart    = moment().subtract(4, 'days').toISOString();
            const dateEnd      = moment().subtract(2, 'days').toISOString();
            const productValue = 15;
            const promoValue   = 5;
            const priceTotal   = await testPromo(app, {dateStart, dateEnd, productValue, promoValue});
            expect(priceTotal).to.be.equal(productValue);
        });
        it('Promo date-4days <=> date+2days (promo applied)', async () => {
            const dateStart    = moment().subtract(2, 'days').toISOString();
            const dateEnd      = moment().add(2, 'days').toISOString();
            const productValue = 15;
            const promoValue   = 5;
            const priceTotal   = await testPromo(app, {dateStart, dateEnd, productValue, promoValue});
            expect(priceTotal).to.be.equal(productValue - promoValue);
        });
        it('Promo date+2days <=> date+4days (promo not applied)', async () => {
            const dateStart    = moment().add(2, 'days').toISOString();
            const dateEnd      = moment().add(4, 'days').toISOString();
            const productValue = 15;
            const promoValue   = 5;
            const priceTotal   = await testPromo(app, {dateStart, dateEnd, productValue, promoValue});
            expect(priceTotal).to.be.equal(productValue);
        });
        it('Promo date-4days <=> null (promo applied)', async () => {
            const dateStart    = moment().subtract(4, 'days').toISOString();
            const dateEnd      = null;
            const productValue = 15;
            const promoValue   = 5;
            const priceTotal   = await testPromo(app, {dateStart, dateEnd, productValue, promoValue});
            expect(priceTotal).to.be.equal(productValue - promoValue);
        });
        it('Promo null <=> null (promo applied)', async () => {
            const dateStart    = null;
            const dateEnd      = null;
            const productValue = 15;
            const promoValue   = 5;
            const priceTotal   = await testPromo(app, {dateStart, dateEnd, productValue, promoValue});
            expect(priceTotal).to.be.equal(productValue - promoValue);
        });
        it('Promo null <=> date+4days (promo applied)', async () => {
            const dateStart    = null;
            const dateEnd      = moment().add(4, 'days').toISOString();
            const productValue = 15;
            const promoValue   = 5;
            const priceTotal   = await testPromo(app, {dateStart, dateEnd, productValue, promoValue});
            expect(priceTotal).to.be.equal(productValue - promoValue);
        });
    });
});