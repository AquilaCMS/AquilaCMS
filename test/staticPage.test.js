const chai                                    = require('chai');
const chaiHttp                                = require('chai-http');
const faker                                   = require('faker');
const app                                     = require('../server');
const createUserAdminAndLogin                 = require('./utils/createUserAdminAndLogin');
const {createStaticPage, deleteAllStaticPage} = require('./utils/createStaticPage');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Statics', () => {
    beforeEach(async () => {
        await deleteAllStaticPage();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/static/', () => {
        it('Should create a staticPage and get it with the code', async () => {
            const staticPage = await createStaticPage();
            const res        = await chai.request(app)
                .post('/api/v2/static')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {code: staticPage.code}}});
            expect(res).to.have.status(200);
            expect(res.body.translation.fr.title).be.equals(staticPage.translation.fr.title);
        });
        it('Should create a staticPage and get the preview URL', async () => {
            const staticPage = await createStaticPage();
            const res        = await chai.request(app)
                .post('/api/v2/static/preview')
                .set('authorization', credentials.token)
                .send(staticPage);
            expect(res).to.have.status(200);
            expect(res.body.url).to.be.a('string').and.satisfy((msg) => msg.endsWith(`preview=${staticPage._id}`));
        });
        it('Should create a staticPage and get it with the id - w/o authentication', async () => {
            const staticPage = await createStaticPage();
            const res        = await chai.request(app)
                .post('/api/v2/static/')
                .send({PostBody : {
                    filter : {
                        _id : staticPage._id
                    },
                    limit : 99
                }
                });
            expect(res).to.have.status(200);
            expect(res.body.title).be.equals(staticPage.translation.fr.title);
        });
        it('Should create a staticPage and try get it with a (wrong) ID', async () => {
            await createStaticPage();
            const res = await chai.request(app)
                .post('/api/v2/static/')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body).to.be.equal(null);
        });
    });
    describe('DELETE /api/v2/static/:id', () => {
        it('Should create a staticPage and delete it (use the ID)', async () => {
            const staticPage = await createStaticPage();
            const res        = await chai.request(app)
                .delete(`/api/v2/static/${staticPage._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
        it('Should staticPage and try to delete it (no authentication)', async () => {
            const staticPage = await createStaticPage();
            const res        = await chai.request(app)
                .delete(`/api/v2/static/${staticPage._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a staticPage and try delete it with a (wrong) ID', async () => {
            await createStaticPage();
            const res = await chai.request(app)
                .delete('/api/v2/static/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Static non trouvé');
        });
    });

    describe('PUT /api/v2/static', () => {
        it('Try creating a staticPage', async () => {
            const code = faker.lorem.slug();
            const res  = await chai.request(app)
                .put('/api/v2/static')
                .set('authorization', credentials.token)
                .send({
                    type        : 'page',
                    group       : null,
                    translation : {fr: {variables: [], html: '', content: '', title: ''}},
                    code
                });
            expect(res).to.have.status(200);
        });
        it('Try creating a staticPage with code that already exists', async () => {
            const code = faker.lorem.slug();
            await createStaticPage({code, content: '', title: ''});
            const res = await chai.request(app)
                .put('/api/v2/static')
                .set('authorization', credentials.token)
                .send({
                    type        : 'page',
                    group       : null,
                    translation : {fr: {variables: [], html: '', content: '', title: ''}},
                    code
                });
            expect(res.body.code).to.be.equal('CodeExisting');
        });
        it('Try creating a staticPage but fail (no authentication)', async () => {
            const code = faker.lorem.slug();
            const res  = await chai.request(app)
                .put('/api/v2/static')
                .send({
                    type        : 'page',
                    group       : null,
                    translation : {fr: {variables: [], html: '', content: '', title: ''}},
                    code
                });
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
    });
    describe('DELETE /api/v2/static/:id', () => {
        it('Get all staticPage of the first page and delete them one by one', async () => {
            await createStaticPage();
            await createStaticPage();
            const res = await chai.request(app)
                .post('/api/v2/statics')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app)
                    .delete(`/api/v2/static/${element._id}`)
                    .set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
        it('Try delete a staticPage but fail (no authentication)', async () => {
            const staticPage = await createStaticPage();
            const res        = await chai.request(app)
                .delete(`/api/v2/static/${staticPage._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try delete a staticPage wit a (wrong) ID and fail', async () => {
            await createStaticPage();
            const res = await chai.request(app)
                .delete('/api/v2/static/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Static non trouvé');
        });
    });
});