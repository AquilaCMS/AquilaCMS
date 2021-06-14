const chai                            = require('chai');
const chaiHttp                        = require('chai-http');
const faker                           = require('faker');
const app                             = require('../server');
const createUserAdminAndLogin         = require('./utils/createUserAdminAndLogin');
const {createPictos, deleteAllPictos} = require('./utils/createPictos');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Pictos', () => {
    beforeEach(async () => {
        await deleteAllPictos();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/picto', () => {
        it('Should create a picto and get it with the code', async () => {
            const picto = await createPictos();
            const res   = await chai.request(app)
                .post('/api/v2/picto')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {code: picto.code}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.name).be.equals(picto.name);
        });
        it('Should create a picto and try get it with the id (no authentication)', async () => {
            const picto = await createPictos();
            const res   = await chai.request(app)
                .post('/api/v2/picto')
                .send({PostBody: {filter: {_id: picto._id}, limit: 99}});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a picto and try get it with a (wrong) ID', async () => {
            await createPictos();
            const res = await chai.request(app)
                .post('/api/v2/picto')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas.length).to.be.equal(0);
            expect(res.body.count).to.be.equal(0);
        });
    });
    describe('DELETE /api/v2/picto/:id', () => {
        it('Should picto and delete it (use the ID)', async () => {
            const picto = await createPictos();
            const res   = await chai.request(app)
                .delete(`/api/v2/picto/${picto._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
        it('Should create a picto and try delete it (no authentication)', async () => {
            const picto = await createPictos();
            const res   = await chai.request(app)
                .delete(`/api/v2/media/${picto._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a picto and try delete it with a (wrong) ID', async () => {
            await createPictos();
            const res = await chai.request(app)
                .delete('/api/v2/picto/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Le pictogramme est introuvable.');
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
        it('Try creating a picto with code that already exists', async () => {
            const codeRandom = faker.lorem.slug();
            const nameRandom = faker.name.title();
            await createPictos({name: nameRandom, code: codeRandom});
            const res = await chai.request(app)
                .put('/api/v2/picto')
                .set('authorization', credentials.token)
                .send({location: 'TOP_LEFT', enabled: false, code: codeRandom, title: nameRandom, filename: ''});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
        it('Try creating a picto but fail (no authentication)', async () => {
            const codeRandom = faker.lorem.slug();
            const nameRandom = faker.name.title();
            const res        = await chai.request(app)
                .put('/api/v2/picto')
                .send({location: 'TOP_LEFT', enabled: false, code: codeRandom, title: nameRandom, filename: ''});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
    });
    describe('DELETE /api/v2/picto/:id', () => {
        it('Get all pictos of the first page and delete them one by one', async () => {
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
        it('Try delete a picto but fail (no authentication)', async () => {
            const picto = await createPictos();
            const res   = await chai.request(app)
                .delete(`/api/v2/picto/${picto._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try delete a picto with a (wrong) ID and fail ', async () => {
            await createPictos();
            const res = await chai.request(app)
                .delete('/api/v2/picto/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Le pictogramme est introuvable.');
        });
    });
});