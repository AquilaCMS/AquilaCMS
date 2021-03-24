const chai                                    = require('chai');
const chaiHttp                                = require('chai-http');
const faker                                   = require('faker');
const app                                     = require('../server');
const createUserAdminAndLogin                 = require('./utils/createUserAdminAndLogin');
const {createTrademarks, deleteAllTrademarks} = require('./utils/createTrademarks');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Trademarks', () => {
    beforeEach(async () => {
        await deleteAllTrademarks();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/trademarks', () => {
        it('Should trademarkss and get it with the id', async () => {
            const trademarks = await createTrademarks();
            const res        = await chai.request(app)
                .post('/api/v2/trademark')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: trademarks._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.name).be.equals(trademarks.name);
        });
        it('Should trademark and get it with the id - w/o authentication', async () => {
            const trademarks = await createTrademarks();
            const res        = await chai.request(app)
                .post('/api/v2/trademark')
                .send({PostBody: {filter: {_id: trademarks._id}, limit: 99}});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should trademark and get it with the id - w/o the good id', async () => {
            await createTrademarks();
            const res = await chai.request(app)
                .post('/api/v2/trademark')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body).to.be.equal(null);
        });
    });
    describe('DELETE /api/v2/trademarks/:id', () => {
        it('Should trademarks and delete it (use the ID)', async () => {
            const trademarks = await createTrademarks();
            const res        = await chai.request(app)
                .delete(`/api/v2/trademark/${trademarks._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
        it('Should trademarks and delete it - w/o authentication', async () => {
            const trademarks = await createTrademarks();
            const res        = await chai.request(app)
                .delete(`/api/v2/trademark/${trademarks._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should trademarks and delete it - w/o the good ID', async () => {
            await createTrademarks();
            const res = await chai.request(app)
                .delete('/api/v2/trademark/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Marque introuvable');
        });
    });

    describe('PUT /api/v2/trademark', () => {
        it('Try creating a trademarks', async () => {
            const nameOftrademarks = faker.lorem.slug();
            const res              = await chai.request(app)
                .put('/api/v2/trademark')
                .set('authorization', credentials.token)
                .send({name: nameOftrademarks});
            expect(res).to.have.status(200);
        });
        it('Try creating a trademarks with code (name) that already exists', async () => {
            const nameOfTrademarks = faker.lorem.slug();
            await createTrademarks({name: nameOfTrademarks});
            const res = await chai.request(app)
                .put('/api/v2/trademark')
                .set('authorization', credentials.token)
                .send({name: nameOfTrademarks});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
        it('Try creating a trademarks - w/o authentication', async () => {
            const nameOfTrademarks = faker.lorem.slug();
            const res              = await chai.request(app)
                .put('/api/v2/trademark')
                .send({media: {link: '', name: nameOfTrademarks, group: ''}});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
    });
    describe('DELETE /api/v2/trademarks/:id', () => {
        it('Get all trademarks of the first page and delete them one by one', async () => {
            await createTrademarks();
            const res = await chai.request(app)
                .post('/api/v2/trademarks')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app).delete(`/api/v2/trademark/${element._id}`).set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
        it('Try delete a trademarks - w/o authentication', async () => {
            const media = await createTrademarks();
            const res   = await chai.request(app)
                .delete(`/api/v2/trademark/${media._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try delete a trademarks - w/o the good ID', async () => {
            await createTrademarks();
            const res = await chai.request(app)
                .delete('/api/v2/trademark/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Marque introuvable');
        });
    });
});