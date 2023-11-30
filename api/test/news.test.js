const chai                        = require('chai');
const chaiHttp                    = require('chai-http');
const faker                       = require('faker');
const app                         = require('../server');
const createUserAdminAndLogin     = require('./utils/createUserAdminAndLogin');
const {createNews, deleteAllNews} = require('./utils/createNews');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('News', () => {
    beforeEach(async () => {
        await deleteAllNews();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/site/news', () => {
        it('Should create a news and get it with the ID', async () => {
            const news = await createNews();
            const res  = await chai.request(app)
                .post('/api/v2/site/new')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: news._id}}});
            expect(res).to.have.status(200);
            expect(res.body.translation.fr.title).be.equals(news.translation.fr.title);
        });
        it('Should create a news and get the preview URL', async () => {
            const news = await createNews();
            const res  = await chai.request(app)
                .post('/api/v2/site/preview')
                .set('authorization', credentials.token)
                .send(news);
            expect(res).to.have.status(200);
            expect(res.body.url).to.be.a('string').and.satisfy((msg) => msg.endsWith(`preview=${news._id}`));
        });
        it('Should create a news and try get it with the id (no authentication)', async () => {
            const news = await createNews();
            const res  = await chai.request(app)
                .post('/api/v2/site/new')
                .send({PostBody: {filter: {_id: news._id}, limit: 99}});
            expect(res).to.have.status(204);
            expect(Object.keys(res.body).length).to.be.equal(0);
        });
        it('Should create a news and get it with a (wrong) id', async () => {
            await createNews();
            const res = await chai.request(app)
                .post('/api/v2/site/new')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body).to.be.equal(null);
        });
    });
    describe('DELETE /api/v2/site/:id', () => {
        it('Should create a news and delete it (use the ID)', async () => {
            const news = await createNews();
            const res  = await chai.request(app)
                .delete(`/api/v2/site/new/${news._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
        it('Should create a news and try delete it (no authentication)', async () => {
            const news = await createNews();
            const res  = await chai.request(app)
                .delete(`/api/v2/site/new/${news._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a news and try delete it a (wrong) ID', async () => {
            await createNews();
            const res = await chai.request(app)
                .delete('/api/v2/site/new/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
            expect(Object.keys(res.body).length).to.be.equal(0);
        });
    });

    describe('PUT /api/v2/site/new', () => {
        it('Try creating a news', async () => {
            const slug  = faker.lorem.slug();
            const title = faker.lorem.slug();
            const res   = await chai.request(app)
                .put('/api/v2/site/new')
                .set('authorization', credentials.token)
                .send({translation: {fr: {slug, title, content: {resume: '', text: ''}}}});
            expect(res).to.have.status(200);
        });
        it('Try creating a news with slug that already exists', async () => {
            const slug  = faker.lorem.slug();
            const title = faker.lorem.slug();
            await createNews({slug});
            const res = await chai.request(app)
                .put('/api/v2/site/new')
                .set('authorization', credentials.token)
                .send({translation: {fr: {slug, title, content: {resume: '', text: ''}}}});
            expect(res.body.code).to.be.equal('SlugAlreadyExist');
        });
        it('Try creating a news but fail (no authentication)', async () => {
            const slug  = faker.lorem.slug();
            const title = faker.lorem.slug();
            const res   = await chai.request(app)
                .put('/api/v2/site/new')
                .send({translation: {fr: {slug, title, content: {resume: '', text: ''}}}});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
    });

    describe('DELETE /api/v2/site/new/:id', () => {
        it('Get all news of the first page and delete them one by one', async () => {
            await createNews();
            const res = await chai.request(app)
                .post('/api/v2/site/news')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 10, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app)
                    .delete(`/api/v2/site/new/${element._id}`)
                    .set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
        it('Try delete a news but fail (no authentication)', async () => {
            const news = await createNews();
            const res  = await chai.request(app)
                .delete(`/api/v2/site/new/${news._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try delete a news with a (wrong) ID and fail', async () => {
            await createNews();
            const res = await chai.request(app)
                .delete('/api/v2/site/new/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
            expect(Object.keys(res.body).length).to.be.equal(0);
        });
    });
});