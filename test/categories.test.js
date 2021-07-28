const chai                                  = require('chai');
const chaiHttp                              = require('chai-http');
const faker                                 = require('faker');
const app                                   = require('../server');
const createUserAdminAndLogin               = require('./utils/createUserAdminAndLogin');
const {createCategory, deleteAllCategories} = require('./utils/createCategory');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Category', () => {
    beforeEach(async () => {
        await deleteAllCategories();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/categories', () => {
        it('Should create a category and get it with category id', async () => {
            const category = await createCategory();
            const res      = await chai.request(app)
                .post('/api/v2/categories')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: category._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas[0].code).be.equals(category.code);
        });

        it('Should try get a category and get it with the id - w/o authentication', async () => {
            const category = await createCategory();
            const res      = await chai.request(app)
                .post('/api/v2/categories')
                .send({PostBody: {filter: {_id: category._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas).to.be.an('array').and.to.be.not.empty;
            expect(res.body.datas[0]).to.have.property('code');
            expect(res.body.datas[0].code).to.be.equals(category.code);
        });

        it('Should create a category and try get it with a wrong id (and not found it)', async () => {
            await createCategory();
            const res = await chai.request(app)
                .post('/api/v2/categories')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas.length).to.be.equal(0);
            expect(res.body.count).to.be.equal(0);
        });
    });
    describe('POST /api/v2/category', () => {
        it('Should create a category and get it with the id', async () => {
            const category = await createCategory();
            const res      = await chai.request(app)
                .post('/api/v2/category')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: category._id}}});
            expect(res).to.have.status(200);
            expect(res.body.name).to.be.equals(category.name);
        });

        it('Should create category and get it with the id - w/o authentication', async () => {
            const category = await createCategory();
            const res      = await chai.request(app)
                .post('/api/v2/category')
                .send({PostBody: {filter: {_id: category._id}}});
            expect(res).to.have.status(200);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal(category.code);
        });

        it('Should create category and try get it with the id but with a wrong id', async () => {
            await createCategory();
            const res = await chai.request(app)
                .post('/api/v2/category/')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}}});
            expect(res).to.have.status(200);
            expect(res.body).to.be.equal(null);
        });
    });

    describe('DELETE /api/v2/category/:id', () => {
        it('Should create a category and delete it (use the ID)', async () => {
            const category = await createCategory();
            const res      = await chai.request(app)
                .delete(`/api/v2/category/${category._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });

        it('Should create a category and try delete it (w/o authentication)', async () => {
            const category = await createCategory();
            const res      = await chai.request(app)
                .delete(`/api/v2/category/${category._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });

        it('Should create a category and try delete it (with a wrong ID)', async () => {
            await createCategory();
            const res = await chai.request(app)
                .delete('/api/v2/category/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Item non trouvé');
        });
    });

    describe('PUT /api/v2/category', () => {
        it('Try creating a category', async () => {
            const code = faker.lorem.slug();
            const name = faker.lorem.slug();
            const slug = faker.lorem.slug();
            const res  = await chai.request(app)
                .put('/api/v2/category')
                .set('authorization', credentials.token)
                .send({id_parent: null, translation: {fr: {name, slug}}, code});
            expect(res).to.have.status(200);
            expect(res.body.code).to.be.equal(code);
            expect(res.body.translation.fr.name).to.be.equal(name);
            expect(res.body.translation.fr.slug).to.be.equal(slug);
        });

        it('Try creating a category with code (name) that already exists', async () => {
            const code = faker.lorem.slug();
            const name = faker.lorem.slug();
            const slug = faker.lorem.slug();
            await createCategory({code, name, slug});
            const res = await chai.request(app)
                .put('/api/v2/category')
                .set('authorization', credentials.token)
                .send({id_parent: null, translation: {fr: {name, slug}}, code});
            expect(res.body.code).to.be.equal('CodeExisting');
        });

        it('Try creating a category with a children with children', async () => {
            const code1 = faker.lorem.slug();
            const name1 = faker.lorem.slug();
            const slug1 = faker.lorem.slug();
            const cat1  = await chai.request(app)
                .put('/api/v2/category')
                .set('authorization', credentials.token)
                .send({id_parent: null, translation: {fr: {name: name1, slug: slug1}}, code: code1});
            const code2 = faker.lorem.slug();
            const name2 = faker.lorem.slug();
            const slug2 = faker.lorem.slug();
            const cat2  = await chai.request(app)
                .put('/api/v2/category')
                .set('authorization', credentials.token)
                .send({id_parent: cat1.body._id, translation: {fr: {name: name2, slug: slug2}}, code: code2});
            expect(cat2.body.ancestors[0]).to.be.equal(cat1.body._id);
            expect(cat2.body.code).to.be.equal(code2);
            expect(cat2.body.translation.fr.name).to.be.equal(name2);
            expect(cat2.body.translation.fr.slug).to.be.equal(slug2);
            const code3 = faker.lorem.slug();
            const name3 = faker.lorem.slug();
            const slug3 = faker.lorem.slug();
            const cat3  = await chai.request(app)
                .put('/api/v2/category')
                .set('authorization', credentials.token)
                .send({id_parent: cat2.body._id, translation: {fr: {name: name3, slug: slug3}}, code: code3});
            expect(cat3).to.have.status(200);
            expect(cat3.body.ancestors[0]).to.be.equal(cat1.body._id);
            expect(cat3.body.ancestors[1]).to.be.equal(cat2.body._id);
            expect(cat3.body.code).to.be.equal(code3);
            expect(cat3.body.translation.fr.name).to.be.equal(name3);
            expect(cat3.body.translation.fr.slug).to.be.equal(slug3);
        });

        it('Try creating a category - w/o authentication', async () => {
            const code = faker.lorem.slug();
            const name = faker.lorem.slug();
            const slug = faker.lorem.slug();
            const res  = await chai.request(app)
                .put('/api/v2/category')
                .send({id_parent: null, translation: {fr: {name, slug}}, code});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
    });

    describe('DELETE /api/v2/category/:id', () => {
        it('Get all category of the first page and delete them one by one', async () => {
            await createCategory();
            await createCategory();
            const res = await chai.request(app)
                .post('/api/v2/categories')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app)
                    .delete(`/api/v2/category/${element._id}`)
                    .set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });

        it('Try delete a category but fail (no authentication)', async () => {
            const category = await createCategory();
            const res      = await chai.request(app)
                .delete(`/api/v2/category/${category._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });

        it('Try delete a category but fail (wrong ID)', async () => {
            await createCategory();
            const res = await chai.request(app)
                .delete('/api/v2/category/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Item non trouvé');
        });
    });
});