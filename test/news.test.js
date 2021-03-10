const chai                    = require('chai');
const chaiHttp                = require('chai-http');
const faker                   = require('faker');
const app                     = require('../server');
const createUserAdminAndLogin = require('./utils/createUserAdminAndLogin');
const createNews              = require('./utils/createNews');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('News', () => {
    beforeEach(async () => {
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/site/news', () => {
        it('Create news and get it with the ID', async () => {
            const news = await createNews();
            const res  = await chai.request(app)
                .post('/api/v2/site/new')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: news._id}}});
            expect(res).to.have.status(200);
            expect(res.body.translation.fr.title).be.equals(news.translation.fr.title);
        });
        it('Create news and get the preview URL', async () => {
            const news = await createNews();
            const res  = await chai.request(app)
                .post('/api/v2/site/preview')
                .set('authorization', credentials.token)
                .send(news);
            expect(res).to.have.status(200);
            expect(res.body.url).to.be.a('string').and.satisfy((msg) => {
                return msg.endsWith(`preview=${news._id}`);
            });
        });
        it('Create news and delete it (use the ID)', async () => {
            const news = await createNews();
            const link = `/api/v2/site/new/${news._id}`;
            const res  = await chai.request(app)
                .delete(link)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
    });

    describe('PUT /api/v2/site/new', () => {
        it('Try creating a news with slug that already exists', async () => {
            const slug = faker.lorem.slug();
            await createNews({slug});
            const res = await chai.request(app)
                .put('/api/v2/site/new')
                .set('authorization', credentials.token)
                .send({translation: {fr: {slug, title: 'zerzerzerzer', content: {resume: '', text: ''}}}});
            expect(res.body.code).to.be.equal('SlugAlreadyExist');
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
                const deleteOne = await chai.request(app).delete(`/api/v2/site/new/${element._id}`).set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
    });
});