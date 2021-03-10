const chai                    = require('chai');
const chaiHttp                = require('chai-http');
const faker                   = require('faker');
const app                     = require('../server');
const createUserAdminAndLogin = require('./utils/createUserAdminAndLogin');
const createStaticPage        = require('./utils/createStaticPage');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Statics', () => {
    beforeEach(async () => {
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/static/', () => {
        it('Create staticPage and get it with the code', async () => {
            const staticPage = await createStaticPage();
            const res        = await chai.request(app)
                .post('/api/v2/static')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {code: staticPage.code}}});
            expect(res).to.have.status(200);
            expect(res.body.translation.fr.title).be.equals(staticPage.translation.fr.title);
        });
        it('Create staticPage and get the preview URL', async () => {
            const staticPage = await createStaticPage();
            const res        = await chai.request(app)
                .post('/api/v2/static/preview')
                .set('authorization', credentials.token)
                .send(staticPage);
            expect(res).to.have.status(200);
            expect(res.body.url).to.be.a('string').and.satisfy((msg) => {
                const text = `preview=${staticPage._id}`;
                if (msg.endsWith(text)) {
                    return true;
                }
                return false;
            });
        });
    });
    describe('DELETE /api/v2/static/:id', () => {
        it('Create news and delete it (use the ID)', async () => {
            const staticPage = await createStaticPage();
            const res        = await chai.request(app)
                .delete(`/api/v2/static/${staticPage._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
    });

    describe('PUT /api/v2/static', () => {
        it('Try creating a news with code that already exists', async () => {
            const code = faker.lorem.slug();
            await createStaticPage({code, content: '', title: ''});
            const res = await chai.request(app)
                .put('/api/v2/static')
                .set('authorization', credentials.token)
                .send({type: 'page', group: null, translation: {fr: {variables: [], html: '', content: '', title: ''}}, code});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
    });
});