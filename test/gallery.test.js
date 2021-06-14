const chai                              = require('chai');
const chaiHttp                          = require('chai-http');
const faker                             = require('faker');
const app                               = require('../server');
const createUserAdminAndLogin           = require('./utils/createUserAdminAndLogin');
const {createGallery, deleteAllGallery} = require('./utils/createGallery');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Gallery', () => {
    beforeEach(async () => {
        await deleteAllGallery();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/galleries', () => {
        it('Should create a gallery and get it with the id', async () => {
            const gallery = await createGallery();
            const res     = await chai.request(app)
                .post('/api/v2/galleries')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: gallery._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas[0].code).be.equals(gallery.code);
        });
        it('Should create a gallery and try get it with the id but fail (no authentication)', async () => {
            const gallery = await createGallery();
            const res     = await chai.request(app)
                .post('/api/v2/galleries')
                .send({PostBody: {filter: {_id: gallery._id}, limit: 99}});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a gallery and try get it with a wrong ID and fail', async () => {
            await createGallery();
            const res = await chai.request(app)
                .post('/api/v2/galleries')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas.length).to.be.equal(0);
            expect(res.body.count).to.be.equal(0);
        });
    });
    describe('POST /api/v2/gallery', () => {
        it('Should create a gallery and get it with the id', async () => {
            const gallery = await createGallery();
            const res     = await chai.request(app)
                .get(`/api/v2/gallery/${gallery._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
            expect(res.body.name).be.equals(gallery.name);
        });
        it('Should create a gallery and try get it with the id buty fail (no authentication)', async () => {
            const gallery = await createGallery();
            const res     = await chai.request(app)
                .get(`/api/v2/gallery/${gallery._id}`);
            expect(res).to.have.status(200);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal(gallery.code);
        });
        it('Should create a gallery and try get it with a (wrong) id', async () => {
            await createGallery();
            const res = await chai.request(app)
                .get('/api/v2/gallery/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('GalleryNotFound');
        });
    });
    describe('DELETE /api/v2/gallery/:id', () => {
        it('Should create a gallery and delete it (use the ID)', async () => {
            const gallery = await createGallery();
            const res     = await chai.request(app)
                .delete(`/api/v2/gallery/${gallery._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
        it('Should gallery and try delete it (no authentication)', async () => {
            const gallery = await createGallery();
            const res     = await chai.request(app)
                .delete(`/api/v2/gallery/${gallery._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a gallery and try delete it with a (wrong) ID', async () => {
            await createGallery();
            const res = await chai.request(app)
                .delete('/api/v2/gallery/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Galerie non trouvée');
        });
    });

    describe('PUT /api/v2/gallery', () => {
        it('Try creating a gallery', async () => {
            const code = faker.lorem.slug();
            const res  = await chai.request(app)
                .put('/api/v2/gallery')
                .set('authorization', credentials.token)
                .send({code, initItemNumber: 12, maxColumnNumber: 4});
            expect(res).to.have.status(200);
            expect(res.body.code).to.be.equal(code);
        });
        it('Try creating a gallery with code that already exists', async () => {
            const code = faker.lorem.slug();
            await createGallery({code});
            const res = await chai.request(app)
                .put('/api/v2/gallery')
                .set('authorization', credentials.token)
                .send({code, initItemNumber: 12, maxColumnNumber: 4});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
        it('Try creating a gallery but fail (no authentication)', async () => {
            const code = faker.lorem.slug();
            const res  = await chai.request(app)
                .put('/api/v2/gallery')
                .send({code, initItemNumber: 12, maxColumnNumber: 4});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
    });
    describe('DELETE /api/v2/gallery/:id', () => {
        it('Get all gallery of the first page and delete them one by one', async () => {
            await createGallery();
            await createGallery();
            const res = await chai.request(app)
                .post('/api/v2/galleries')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app)
                    .delete(`/api/v2/gallery/${element._id}`)
                    .set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
        it('Try delete a gallery but fail (no authentication)', async () => {
            const gallery = await createGallery();
            const res     = await chai.request(app)
                .delete(`/api/v2/gallery/${gallery._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try delete a gallery with a (wrong) ID but fail', async () => {
            await createGallery();
            const res = await chai.request(app)
                .delete('/api/v2/gallery/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Galerie non trouvée');
        });
    });
});