const chai                    = require('chai');
const chaiHttp                = require('chai-http');
const faker                   = require('faker');
const app                     = require('../server');
const createUserAdminAndLogin = require('./utils/createUserAdminAndLogin');
const createPictos            = require('./utils/createPictos');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Pictos', () => {
    beforeEach(async () => {
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/picto', () => {
        it('Create picto and get it with the code', async () => {
            const picto = await createPictos();
            const res   = await chai.request(app)
                .post('/api/v2/picto')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {code: picto.code}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.name).be.equals(picto.name);
        });
    });
    describe('DELETE /api/v2/picto/:id', () => {
        it('Create picto and delete it (use the ID)', async () => {
            const picto = await createPictos();
            const res   = await chai.request(app)
                .delete(`/api/v2/picto/${picto._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
    });

    describe('PUT /api/v2/picto', () => {
        it('Try creating a picto', async () => {
            const codeRandom = faker.lorem.slug();
            const nameRandom = faker.name.title();
            const res        = await chai.request(app)
                .put('/api/v2/picto')
                .set('authorization', credentials.token)
                .send({location: 'TOP_LEFT', enabled: false, code: codeRandom, title: nameRandom, filename: ''});
            expect(res).to.have.status(200);
        });
        it('Try creating a picto with code (name) that already exists', async () => {
            const codeRandom = faker.lorem.slug();
            const nameRandom = faker.name.title();
            await createPictos({name: nameRandom, code: codeRandom});
            const res = await chai.request(app)
                .put('/api/v2/picto')
                .set('authorization', credentials.token)
                .send({location: 'TOP_LEFT', enabled: false, code: codeRandom, title: nameRandom, filename: ''});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
    });
    describe('DELETE /api/v2/picto/:id', () => {
        it('Get all picto of the first page and delete them one by one', async () => {
            await createPictos();
            const res = await chai.request(app)
                .post('/api/v2/picto')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app).delete(`/api/v2/picto/${element._id}`).set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
    });
});