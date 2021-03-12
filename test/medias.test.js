const chai                    = require('chai');
const chaiHttp                = require('chai-http');
const faker                   = require('faker');
const app                     = require('../server');
const createUserAdminAndLogin = require('./utils/createUserAdminAndLogin');
const createMedias            = require('./utils/createMedias');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Medias', () => {
    beforeEach(async () => {
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
    });
    describe('DELETE /api/v2/media/:id', () => {
        it('Create media and delete it (use the ID)', async () => {
            const media = await createMedias();
            const link  = `/api/v2/media/${media._id}`;
            const res   = await chai.request(app)
                .delete(link)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
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
    });
    describe('DELETE /api/v2/media/:id', () => {
        it('Get all media of the first page and delete them one by one', async () => {
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
    });
});