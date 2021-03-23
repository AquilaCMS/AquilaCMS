const chai                          = require('chai');
const chaiHttp                      = require('chai-http');
const faker                         = require('faker');
const app                           = require('../server');
const createUserAdminAndLogin       = require('./utils/createUserAdminAndLogin');
const {createPromo, deleteAllPromo} = require('./utils/createPromo');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Promo', () => {
    beforeEach(async () => {
        await deleteAllPromo();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/promos', () => {
        it('Create promo and get it with the id', async () => {
            const promo = await createPromo();
            const res   = await chai.request(app)
                .post('/api/v2/promos')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: promo._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas[0].code).be.equals(promo.code);
        });
        it('Create promo and get it with the id - w/o authentication', async () => {
            const promo = await createPromo();
            const res   = await chai.request(app)
                .post('/api/v2/promos')
                .send({PostBody: {filter: {_id: promo._id}, limit: 99}});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Create promo and get it with the id - w/o the good id', async () => {
            await createPromo();
            const res = await chai.request(app)
                .post('/api/v2/promos')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas.length).to.be.equal(0);
            expect(res.body.count).to.be.equal(0);
        });
    });
    describe('POST /api/v2/promo', () => {
        it('Create promo and get it with the id', async () => {
            const promo = await createPromo();
            const res   = await chai.request(app)
                .post('/api/v2/promo/')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: promo._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.name).be.equals(promo.name);
        });
        it('Create promo and get it with the id - w/o authentication', async () => {
            const promo = await createPromo();
            const res   = await chai.request(app)
                .post('/api/v2/promo')
                .send({PostBody: {filter: {_id: promo._id}, limit: 99}});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Create promo and get it with the id - w/o the good id', async () => {
            await createPromo();
            const res = await chai.request(app)
                .post('/api/v2/promo')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body).to.be.equal(null);
        });
    });
    describe('DELETE /api/v2/promo/:id', () => {
        it('Create promo and delete it (use the ID)', async () => {
            const promo = await createPromo();
            const res   = await chai.request(app)
                .delete(`/api/v2/promo/${promo._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
        it('Create promo and delete it - w/o authentication', async () => {
            const promo = await createPromo();
            const res   = await chai.request(app)
                .delete(`/api/v2/promo/${promo._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Create promo and delete it - w/o the good ID', async () => {
            await createPromo();
            const res = await chai.request(app)
                .delete('/api/v2/promo/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Impossible de trouver la promotion');
        });
    });

    describe('PUT /api/v2/promo', () => {
        it('Try creating a promo', async () => {
            const name = faker.lorem.slug();
            const desc = faker.lorem.sentence();
            const res  = await chai.request(app)
                .put('/api/v2/promo')
                .set('authorization', credentials.token)
                .send({name, description: desc, type: '1'});
            expect(res).to.have.status(200);
            expect(res.body.name).to.be.equal(name);
        });
        it('Try creating a promo with code that already exists', async () => {
            const name = faker.lorem.slug();
            const desc = faker.lorem.sentence();
            await createPromo({name, desc});
            const res = await chai.request(app)
                .put('/api/v2/promo')
                .set('authorization', credentials.token)
                .send({name, description: desc, type: '1'});
            expect(res).to.have.status(409);
            expect(res.body.code).to.be.equal('CodeExisting');
        });
        it('Try creating a promo - w/o authentication', async () => {
            const code = faker.lorem.slug();
            const res  = await chai.request(app)
                .put('/api/v2/promo')
                .send({code, initItemNumber: 12, maxColumnNumber: 4});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
    });
    describe('DELETE /api/v2/promo/:id', () => {
        it('Get all promo of the first page and delete them one by one', async () => {
            await createPromo();
            await createPromo();
            const res = await chai.request(app)
                .post('/api/v2/promos')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app)
                    .delete(`/api/v2/promo/${element._id}`)
                    .set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
        it('Try delete a promo - w/o authentication', async () => {
            const promo = await createPromo();
            const res   = await chai.request(app)
                .delete(`/api/v2/promo/${promo._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try delete a promo - w/o the good ID', async () => {
            await createPromo();
            const res = await chai.request(app)
                .delete('/api/v2/promo/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Impossible de trouver la promotion');
        });
    });
});