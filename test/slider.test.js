const chai                    = require('chai');
const chaiHttp                = require('chai-http');
const faker                   = require('faker');
const app                     = require('../server');
const createUserAdminAndLogin = require('./utils/createUserAdminAndLogin');
const createSlider            = require('./utils/createSlider');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Sliders', () => {
    beforeEach(async () => {
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/slider', () => {
        it('Create slider and get it with the code', async () => {
            const slider = await createSlider();
            const res    = await chai.request(app)
                .post('/api/v2/slider')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {code: slider.code}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.name).be.equals(slider.name);
        });
    });
    describe('DELETE /api/v2/slider/:id', () => {
        it('Create slider and delete it (use the ID)', async () => {
            const slider = await createSlider();
            const res    = await chai.request(app)
                .delete(`/api/v2/slider/${slider._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
    });

    describe('PUT /api/v2/slider', () => {
        it('Try creating a slider', async () => {
            const codeRandom = faker.lorem.slug();
            const res        = await chai.request(app)
                .put('/api/v2/slider')
                .set('authorization', credentials.token)
                .send({code: codeRandom, autoplay: true, pauseOnHover: true, infinite: true, autoplaySpeed: 2000, items: []});
            expect(res).to.have.status(200);
        });
        it('Try creating a slider with code (name) that already exists', async () => {
            const codeRandom = faker.lorem.slug();
            await createSlider({code: codeRandom});
            const res = await chai.request(app)
                .put('/api/v2/slider')
                .set('authorization', credentials.token)
                .send({code: codeRandom, autoplay: true, pauseOnHover: true, infinite: true, autoplaySpeed: 2000, items: []});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
    });
    describe('DELETE /api/v2/slider/:id', () => {
        it('Get all slider of the first page and delete them one by one', async () => {
            await createSlider();
            const res = await chai.request(app)
                .post('/api/v2/sliders')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app).delete(`/api/v2/slider/${element._id}`).set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
    });
});