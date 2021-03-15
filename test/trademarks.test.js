const chai                    = require('chai');
const chaiHttp                = require('chai-http');
const faker                   = require('faker');
const app                     = require('../server');
const createUserAdminAndLogin = require('./utils/createUserAdminAndLogin');
const createTrademarks        = require('./utils/createTrademarks');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Trademarks', () => {
    beforeEach(async () => {
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/trademarks', () => {
        it('Create trademarkss and get it with the id', async () => {
            const trademarks = await createTrademarks();
            const res        = await chai.request(app)
                .post('/api/v2/trademark')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: trademarks._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.name).be.equals(trademarks.name);
        });
    });
    describe('DELETE /api/v2/trademarks/:id', () => {
        it('Create trademarks and delete it (use the ID)', async () => {
            const trademarks = await createTrademarks();
            const link       = `/api/v2/trademark/${trademarks._id}`;
            const res        = await chai.request(app)
                .delete(link)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
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
            const nameOftrademarks = faker.lorem.slug();
            await createTrademarks({name: nameOftrademarks});
            const res = await chai.request(app)
                .put('/api/v2/trademark')
                .set('authorization', credentials.token)
                .send({name: nameOftrademarks});
            expect(res.body.code).to.be.equal('CodeExisting');
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
    });
});