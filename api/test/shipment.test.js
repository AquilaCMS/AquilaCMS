const chai                                  = require('chai');
const chaiHttp                              = require('chai-http');
const faker                                 = require('faker');
const app                                   = require('../server');
const createUserAdminAndLogin               = require('./utils/createUserAdminAndLogin');
const {createShipments, deleteAllShipments} = require('./utils/createShipments');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Shipments', () => {
    beforeEach(async () => {
        await deleteAllShipments();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/shipments', () => {
        it('Should create a shipment and get it with the code', async () => {
            const shipment = await createShipments();
            const res      = await chai.request(app)
                .post('/api/v2/shipments')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {code: shipment.code}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas[0].name).be.equals(shipment.name);
        });
        it('Should create a shipment and get it with the id (no authentication)', async () => {
            const shipment = await createShipments();
            const res      = await chai.request(app)
                .post('/api/v2/shipments')
                .send({PostBody: {filter: {_id: shipment._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas[0].name).be.equals(shipment.translation.fr.name);
        });
        it('Should create a shipment and get it with a (wrong) ID', async () => {
            await createShipments();
            const res = await chai.request(app)
                .post('/api/v2/shipments')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas.length).to.be.equal(0);
            expect(res.body.count).to.be.equal(0);
        });
    });
    describe('DELETE /api/v2/shipment/:id', () => {
        it('Should create a shipment and delete it (use the ID)', async () => {
            const shipment = await createShipments();
            const res      = await chai.request(app)
                .delete(`/api/v2/shipment/${shipment._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
        it('Should create a shipment and try delete it (no authentication)', async () => {
            const shipment = await createShipments();
            const res      = await chai.request(app)
                .delete(`/api/v2/shipment/${shipment._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a shipment and try delete it with a (wrong) ID', async () => {
            await createShipments();
            const res = await chai.request(app)
                .delete('/api/v2/shipment/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Le Shipment est introuvable');
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
        it('Try creating a shipment with code that already exists', async () => {
            const codeRandom = faker.lorem.slug();
            const nameRandom = faker.name.title();
            await createShipments({name: nameRandom, code: codeRandom});
            const res = await chai.request(app)
                .put('/api/v2/shipment')
                .set('authorization', credentials.token)
                .send({type: 'DELIVERY', countries: [], code: codeRandom, translation: {fr: {name: nameRandom}}});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
        it('Try creating a shipment but fail (no authentication)', async () => {
            const codeRandom = faker.lorem.slug();
            const nameRandom = faker.name.title();
            const res        = await chai.request(app)
                .put('/api/v2/shipment')
                .send({type: 'DELIVERY', countries: [], code: codeRandom, translation: {fr: {name: nameRandom}}});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
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
                const deleteOne = await chai.request(app)
                    .delete(`/api/v2/shipment/${element._id}`)
                    .set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
        it('Try delete a shipment but fail (no authentication)', async () => {
            const shipment = await createShipments();
            const res      = await chai.request(app)
                .delete(`/api/v2/shipment/${shipment._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try shipment a shipment with a (wrong) ID and fail', async () => {
            await createShipments();
            const res = await chai.request(app)
                .delete('/api/v2/shipment/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Le Shipment est introuvable');
        });
    });
});