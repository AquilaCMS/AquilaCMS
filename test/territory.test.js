const chai                                  = require('chai');
const chaiHttp                              = require('chai-http');
const faker                                 = require('faker');
const app                                   = require('../server');
const createUserAdminAndLogin               = require('./utils/createUserAdminAndLogin');
const {createTerritory, deleteAllTerritory} = require('./utils/createTerritory');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Territory', () => {
    beforeEach(async () => {
        await deleteAllTerritory();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/territory', () => {
        it('Should create a territory and get it with the id', async () => {
            const territory = await createTerritory();
            const res       = await chai.request(app)
                .post('/api/v2/territories')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: territory._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas[0].translation.fr.name).be.equals(territory.translation.fr.name);
            expect(res.body.datas[0].code).be.equals(territory.code);
        });
        it('Should create a territory and try to get it with a (wrong) ID', async () => {
            const territory = await createTerritory();
            const res       = await chai.request(app)
                .post('/api/v2/territories')
                .send({PostBody: {filter: {_id: territory._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas[0].code).be.equals(territory.code);
        });
        it('Should create a territory and get it with a (wrong) ID', async () => {
            await createTerritory();
            const res = await chai.request(app)
                .post('/api/v2/territories')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas.length).to.be.equal(0);
            expect(res.body.count).to.be.equal(0);
        });
    });
    describe('DELETE /api/v2/territory/:id', () => {
        it('Should create a territory and delete it (use the ID)', async () => {
            const territory = await createTerritory();
            const res       = await chai.request(app)
                .delete(`/api/v2/territory/${territory._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
            expect(Object.keys(res.body).length).to.be.equal(0);
        });
        it('Should create a territory and try delete it (no authentication)', async () => {
            const territory = await createTerritory();
            const res       = await chai.request(app)
                .delete(`/api/v2/territory/${territory._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a territory and try to delete it with a (wrong) ID', async () => {
            await createTerritory();
            const res = await chai.request(app)
                .delete('/api/v2/territory/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
            expect(Object.keys(res.body).length).to.be.equal(0);
        });
    });

    describe('PUT /api/v2/territory', () => {
        it('Try creating a territory', async () => {
            const name = faker.lorem.slug();
            const code = faker.lorem.slug();
            const res  = await chai.request(app)
                .put('/api/v2/territory')
                .set('authorization', credentials.token)
                .send({translation: {fr: {name}}, name: '', code, taxeFree: false});
            expect(res).to.have.status(200);
        });
        it('Try creating a territory with code that already exists', async () => {
            const name = faker.lorem.slug();
            const code = faker.lorem.slug();
            await createTerritory({name, code});
            const res = await chai.request(app)
                .put('/api/v2/territory')
                .set('authorization', credentials.token)
                .send({translation: {fr: {name}}, name: '', code, taxeFree: false});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
        it('Try creating a territory but fail (no authentication)', async () => {
            const name = faker.lorem.slug();
            const code = faker.lorem.slug();
            const res  = await chai.request(app)
                .put('/api/v2/territory')
                .send({translation: {fr: {name}}, name: '', code, taxeFree: false});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
    });
    describe('DELETE /api/v2/territory/:id', () => {
        it('Get all territory of the first page and delete them one by one', async () => {
            await createTerritory();
            await createTerritory();
            const res = await chai.request(app)
                .post('/api/v2/territories')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app)
                    .delete(`/api/v2/territory/${element._id}`)
                    .set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
        it('Try delete a territory but fail (no authentication)', async () => {
            const territory = await createTerritory();
            const res       = await chai.request(app)
                .delete(`/api/v2/territory/${territory._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try delete a territory with a (wrong ID) and fail', async () => {
            await createTerritory();
            const res = await chai.request(app)
                .delete('/api/v2/territory/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
            expect(Object.keys(res.body).length).to.be.equal(0);
        });
    });
});