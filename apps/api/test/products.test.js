const chai                               = require('chai');
const chaiHttp                           = require('chai-http');
const faker                              = require('faker');
const app                                = require('../server');
const createUserAdminAndLogin            = require('./utils/createUserAdminAndLogin');
const {createProduct, deleteAllProducts} = require('./utils/createProduct');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Products', () => {
    beforeEach(async () => {
        await deleteAllProducts();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/products', () => {
        it('Should create a product and get it with the id', async () => {
            const product = await createProduct();
            const res     = await chai.request(app)
                .post('/api/v2/products')
                .set('authorization', credentials.token)
                .send({
                    PostBody : {
                        filter   : {_id: product._id},
                        populate : ['set_attributes', 'associated_prds'],
                        limit    : 99
                    }
                });
            expect(res).to.have.status(200);
            expect(res.body.datas[0].translation.fr.name).be.equals(product.translation.fr.name);
        });
        it('Should create a product and try get it with the id (no authentication)', async () => {
            const product = await createProduct();
            const res     = await chai.request(app)
                .post('/api/v2/products')
                .send({
                    PostBody : {
                        filter   : {_id: product._id},
                        populate : ['set_attributes', 'associated_prds'],
                        limit    : 99
                    }
                });
            expect(res).to.have.status(200);
            expect(res.body.datas).to.be.an('array').and.to.be.not.empty;
            expect(res.body.datas[0].name).to.be.equals(product.translation.fr.name);
            expect(res.body.datas[0].slug.fr).to.be.equals(product.translation.fr.slug);
        });

        it('Should create a product and get it with a (wrong) ID', async () => {
            await createProduct();
            const res = await chai.request(app)
                .post('/api/v2/products')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, populate: ['set_attributes', 'associated_prds'], limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas.length).to.be.equal(0);
            expect(res.body.count).to.be.equal(0);
        });
    });
    describe('POST /api/v2/product', () => {
        it('Should create a product and get it with the id', async () => {
            const product = await createProduct();
            const res     = await chai.request(app)
                .post('/api/v2/product')
                .set('authorization', credentials.token)
                .send({
                    PostBody : {
                        filter    : {code: product.code},
                        populate  : ['set_attributes', 'associated_prds'],
                        structure : '*'
                    }
                });
            expect(res).to.have.status(200);
            expect(res.body.translation.fr.name).be.equals(product.translation.fr.name);
        });
        it('Should create a product and get it with the id (no authentication)', async () => {
            const product = await createProduct();
            const res     = await chai.request(app)
                .post('/api/v2/product')
                .send({
                    PostBody : {
                        filter    : {code: product.code},
                        populate  : ['set_attributes', 'associated_prds'],
                        structure : '*'
                    }
                });
            expect(res).to.have.status(200);
            expect(res.body.name).be.equals(product.translation.fr.name);
        });
        it('Should create a product and get it with a (wrong) ID', async () => {
            await createProduct();
            const res = await chai.request(app)
                .post('/api/v2/product/')
                .set('authorization', credentials.token)
                .send({
                    PostBody : {
                        filter    : {_id: '111111111111111111111111'},
                        populate  : ['set_attributes', 'associated_prds'],
                        structure : '*'
                    }
                });
            expect(res).to.have.status(200);
            expect(res.body).to.be.equal(null);
        });
    });
    describe('DELETE /api/v2/product/:id', () => {
        it('Should create a product and delete it (use the ID)', async () => {
            const product = await createProduct();
            const res     = await chai.request(app)
                .delete(`/api/v2/product/${product._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
        it('Should create a product and try delete it (no authentication)', async () => {
            const product = await createProduct();
            const res     = await chai.request(app)
                .delete(`/api/v2/product/${product._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a product and try delete it with a (wrong) ID, and fail', async () => {
            await createProduct();
            const res = await chai.request(app)
                .delete('/api/v2/product/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Produit non trouvé');
        });
    });

    describe('PUT /api/v2/product', () => {
        it('Try creating a product', async () => {
            const code = faker.lorem.slug();
            const name = faker.lorem.slug();
            const res  = await chai.request(app)
                .put('/api/v2/product')
                .set('authorization', credentials.token)
                .send({code, translation: {fr: {name}}});
            expect(res).to.have.status(200);
            expect(res.body.code).to.be.equal(code);
            expect(res.body.translation.fr.name).to.be.equal(name);
        });
        it('Try creating a product with code (name) that already exists', async () => {
            const code = faker.lorem.slug();
            const name = faker.lorem.slug();
            await createProduct({code, name});
            const res = await chai.request(app)
                .put('/api/v2/product')
                .set('authorization', credentials.token)
                .send({code, translation: {fr: {name}}});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
        it('Try creating two product and associeted them', async () => {
            const code1    = faker.lorem.slug();
            const name1    = faker.lorem.slug();
            const product1 = await chai.request(app)
                .put('/api/v2/product')
                .set('authorization', credentials.token)
                .send({code: code1, translation: {fr: {name: name1}}});
            const code2    = faker.lorem.slug();
            const name2    = faker.lorem.slug();
            const product2 = await chai.request(app)
                .put('/api/v2/product')
                .set('authorization', credentials.token)
                .send({
                    code            : code2,
                    translation     : {fr: {name: name2}},
                    associated_prds : [product1.body._id]
                });
            expect(product2.body.code).to.be.equal(code2);
            expect(product2.body.translation.fr.name).to.be.equal(name2);
            expect(product2.body).have.property('associated_prds');
            expect(product2.body.associated_prds[0]).to.be.equal(product1.body._id);
        });
        it('Try creating a product - w/o authentication', async () => {
            const code = faker.lorem.slug();
            const name = faker.lorem.slug();
            const res  = await chai.request(app)
                .put('/api/v2/product')
                .send({code, translation: {fr: {name}}});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
    });
    describe('DELETE /api/v2/product/:id', () => {
        it('Get all product of the first page and delete them one by one', async () => {
            await createProduct();
            await createProduct();
            const res = await chai.request(app)
                .post('/api/v2/products')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app)
                    .delete(`/api/v2/product/${element._id}`)
                    .set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
        it('Try delete a product - w/o authentication', async () => {
            const product = await createProduct();
            const res     = await chai.request(app)
                .delete(`/api/v2/product/${product._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try delete a product - w/o the good ID', async () => {
            await createProduct();
            const res = await chai.request(app)
                .delete('/api/v2/product/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.be.equal('Produit non trouvé');
        });
    });
});