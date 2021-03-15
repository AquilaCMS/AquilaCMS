const chai                    = require('chai');
const chaiHttp                = require('chai-http');
const faker                   = require('faker');
const app                     = require('../server');
const createUserAdminAndLogin = require('./utils/createUserAdminAndLogin');
const createShipments         = require('./utils/createShipments');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Shipments', () => {
    beforeEach(async () => {
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/shipment', () => {
        it('Create shipment and get it with the code', async () => {
            const shipment = await createShipments();
            const res      = await chai.request(app)
                .post('/api/v2/shipment')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {code: shipment.code}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.name).be.equals(shipment.name);
        });
    });
    describe('DELETE /api/v2/shipment/:id', () => {
        it('Create shipment and delete it (use the ID)', async () => {
            const shipment = await createShipments();
            const res      = await chai.request(app)
                .delete(`/api/v2/shipment/${shipment._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
    });

    describe('PUT /api/v2/shipment', () => {
        it('Try creating a shipment', async () => {
            const codeRandom = faker.lorem.slug();
            const nameRandom = faker.name.title();
            const res        = await chai.request(app)
                .put('/api/v2/shipment')
                .set('authorization', credentials.token)
                .send({type: 'DELIVERY', countries: [], code: codeRandom, translation: {fr: {name: nameRandom}}});
            expect(res).to.have.status(200);
        });
        it('Try creating a shipment with code (name) that already exists', async () => {
            const codeRandom = faker.lorem.slug();
            const nameRandom = faker.name.title();
            await createShipments({name: nameRandom, code: codeRandom});
            const res = await chai.request(app)
                .put('/api/v2/shipment')
                .set('authorization', credentials.token)
                .send({type: 'DELIVERY', countries: [], code: codeRandom, translation: {fr: {name: nameRandom}}});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
    });
    describe('DELETE /api/v2/shipment/:id', () => {
        it('Get all shipment of the first page and delete them one by one', async () => {
            await createShipments();
            const res = await chai.request(app)
                .post('/api/v2/shipments')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app).delete(`/api/v2/shipment/${element._id}`).set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
    });
});