const chai                            = require('chai');
const chaiHttp                        = require('chai-http');
const faker                           = require('faker');
const app                             = require('../server');
const createUserAdminAndLogin         = require('./utils/createUserAdminAndLogin');
const {createMedias, deleteAllMedias} = require('./utils/createMedias');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Medias', () => {
    beforeEach(async () => {
        await deleteAllMedias();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/media', () => {
        it('Create Medias and get it with the id', async () => {
            const media = await createMedias();
            const res   = await chai.request(app)
                .post('/api/v2/media')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: media._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.name).be.equals(media.name);
        });
        it('Create Medias and get it with the id - w/o authentication', async () => {
            const media = await createMedias();
            const res   = await chai.request(app)
                .post('/api/v2/media')
                .send({PostBody: {filter: {_id: media._id}, limit: 99}});
            expect(res).to.have.status(200);
        });
        it('Create Medias and get it with the id - w/o the good id', async () => {
            await createMedias();
            const res = await chai.request(app)
                .post('/api/v2/media')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body).to.be.equal(null);
        });
    });
    describe('DELETE /api/v2/media/:id', () => {
        it('Create media and delete it (use the ID)', async () => {
            const media = await createMedias();
            const res   = await chai.request(app)
                .delete(`/api/v2/media/${media._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
        it('Create media and delete it - w/o authentication', async () => {
            const media = await createMedias();
            const res   = await chai.request(app)
                .delete(`/api/v2/media/${media._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Create media and delete it - w/o the good ID', async () => {
            await createMedias();
            const res = await chai.request(app)
                .delete('/api/v2/media/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Média introuvable');
        });
    });

    describe('PUT /api/v2/media', () => {
        it('Try creating a medias', async () => {
            const nameOfMedia = faker.lorem.slug();
            const res         = await chai.request(app)
                .put('/api/v2/media')
                .set('authorization', credentials.token)
                .send({media: {link: '', name: nameOfMedia, group: ''}});
            expect(res).to.have.status(200);
        });
        it('Try creating a media with code (name) that already exists', async () => {
            const name = faker.lorem.slug();
            await createMedias({name});
            const res = await chai.request(app)
                .put('/api/v2/media')
                .set('authorization', credentials.token)
                .send({media: {link: '', name, group: ''}});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
        it('Try creating a medias - w/o authentication', async () => {
            const nameOfMedia = faker.lorem.slug();
            const res         = await chai.request(app)
                .put('/api/v2/media')
                .send({media: {link: '', name: nameOfMedia, group: ''}});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
    });
    describe('DELETE /api/v2/media/:id', () => {
        it('Get all media of the first page and delete them one by one', async () => {
            await createMedias();
            await createMedias();
            const res = await chai.request(app)
                .post('/api/v2/medias')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app).delete(`/api/v2/media/${element._id}`).set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
        it('Try delete a media - w/o authentication', async () => {
            const media = await createMedias();
            const res   = await chai.request(app)
                .delete(`/api/v2/media/${media._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try delete a media - w/o the good ID', async () => {
            await createMedias();
            const res = await chai.request(app)
                .delete('/api/v2/media/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Média introuvable');
        });
    });
});