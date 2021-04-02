const chai                            = require('chai');
const chaiHttp                        = require('chai-http');
const faker                           = require('faker');
const app                             = require('../server');
const createUserAdminAndLogin         = require('./utils/createUserAdminAndLogin');
const {createSlider, deleteAllSlider} = require('./utils/createSlider');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Sliders', () => {
    beforeEach(async () => {
        await deleteAllSlider();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/sliders', () => {
        it('Should create a slider and get it with the code', async () => {
            const slider = await createSlider();
            const res    = await chai.request(app)
                .post('/api/v2/sliders')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {code: slider.code}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas[0].name).be.equals(slider.name);
        });
        it('Should create a slider and get it with the id (no authentication)', async () => {
            const slider = await createSlider();
            const res    = await chai.request(app)
                .post('/api/v2/sliders')
                .send({PostBody: {filter: {_id: slider._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas[0].name).be.equals(slider.name);
        });
        it('Should create slider and get it with a (wrong) ID', async () => {
            await createSlider();
            const res = await chai.request(app)
                .post('/api/v2/sliders')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas.length).to.be.equal(0);
            expect(res.body.count).to.be.equal(0);
        });
    });
    describe('DELETE /api/v2/slider/:id', () => {
        it('Should create a slider and delete it (use the ID)', async () => {
            const slider = await createSlider();
            const res    = await chai.request(app)
                .delete(`/api/v2/slider/${slider._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
        it('Should create a slider and try delete it (no authentication)', async () => {
            const slider = await createSlider();
            const res    = await chai.request(app)
                .delete(`/api/v2/slider/${slider._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a slider and delete it with a (wrong ID)', async () => {
            await createSlider();
            const res = await chai.request(app)
                .delete('/api/v2/slider/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Slider introuvable');
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
        it('Try creating a slider with code that already exists', async () => {
            const codeRandom = faker.lorem.slug();
            await createSlider({code: codeRandom});
            const res = await chai.request(app)
                .put('/api/v2/slider')
                .set('authorization', credentials.token)
                .send({code: codeRandom, autoplay: true, pauseOnHover: true, infinite: true, autoplaySpeed: 2000, items: []});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
        it('Try creating a slider but fail (no authentication)', async () => {
            const codeRandom = faker.lorem.slug();
            const res        = await chai.request(app)
                .put('/api/v2/slider')
                .send({code: codeRandom, autoplay: true, pauseOnHover: true, infinite: true, autoplaySpeed: 2000, items: []});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
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
                const deleteOne = await chai.request(app)
                    .delete(`/api/v2/slider/${element._id}`)
                    .set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
        it('Try delete a slider but fail (no authentication)', async () => {
            const slider = await createSlider();
            const res    = await chai.request(app)
                .delete(`/api/v2/slider/${slider._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try delete a slider with a (wrong) ID and fail', async () => {
            await createSlider();
            const res = await chai.request(app)
                .delete('/api/v2/slider/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Slider introuvable');
        });
    });
});