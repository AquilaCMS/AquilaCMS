const chai                                  = require('chai');
const chaiHttp                              = require('chai-http');
const faker                                 = require('faker');
const app                                   = require('../server');
const createUserAdminAndLogin               = require('./utils/createUserAdminAndLogin');
const {createSuppliers, deleteAllSuppliers} = require('./utils/createSuppliers');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Suppliers', () => {
    beforeEach(async () => {
        await deleteAllSuppliers();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/supplier', () => {
        it('Should create a supplier and get it with the code', async () => {
            const supplier = await createSuppliers();
            const res      = await chai.request(app)
                .post('/api/v2/supplier')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {code: supplier.code}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.name).be.equals(supplier.name);
        });
        it('Should create a supplier and get it with the id - w/o authentication', async () => {
            const supplier = await createSuppliers();
            const res      = await chai.request(app)
                .post('/api/v2/supplier')
                .send({PostBody: {filter: {_id: supplier._id}, limit: 99}});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a supplier and get it with the id - w/o the good id', async () => {
            await createSuppliers();
            const res = await chai.request(app)
                .post('/api/v2/supplier')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body).to.be.equal(null);
        });
    });
    describe('DELETE /api/v2/supplier/:id', () => {
        it('Should create a supplier and delete it (use the ID)', async () => {
            const supplier = await createSuppliers();
            const res      = await chai.request(app)
                .delete(`/api/v2/supplier/${supplier._id}`)
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
        });
        it('Should create a supplier and try delete it (no authentication)', async () => {
            const supplier = await createSuppliers();
            const res      = await chai.request(app)
                .delete(`/api/v2/supplier/${supplier._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Should create a supplier and try delete it with a (wrong) ID', async () => {
            await createSuppliers();
            const res = await chai.request(app)
                .delete('/api/v2/supplier/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
            expect(Object.keys(res.body).length).to.be.equal(0);
        });
    });

    describe('PUT /api/v2/supplier', () => {
        it('Try creating a supplier', async () => {
            const codeRandom = faker.lorem.slug();
            const nameRandom = faker.name.title();
            const res        = await chai.request(app)
                .put('/api/v2/supplier')
                .set('authorization', credentials.token)
                .send({code: codeRandom, name: nameRandom});
            expect(res).to.have.status(200);
            expect(res.body.name).to.be.equal(nameRandom);
        });
        it('Try creating a supplier with code that already exists', async () => {
            const codeRandom = faker.lorem.slug();
            const nameRandom = faker.name.title();
            await createSuppliers({name: nameRandom, code: codeRandom});
            const res = await chai.request(app)
                .put('/api/v2/supplier')
                .set('authorization', credentials.token)
                .send({code: codeRandom, name: nameRandom});
            expect(res.body.code).to.be.equal('CodeExisting');
        });
        it('Try creating a supplier but fail (no authentication)', async () => {
            const codeRandom = faker.lorem.slug();
            const nameRandom = faker.name.title();
            const res        = await chai.request(app)
                .put('/api/v2/supplier')
                .send({code: codeRandom, name: nameRandom});
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
    });
    describe('DELETE /api/v2/supplier/:id', () => {
        it('Get all supplier of the first page and delete them one by one', async () => {
            await createSuppliers();
            const res = await chai.request(app)
                .post('/api/v2/suppliers')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}, structure: '*', limit: 20, page: 1}});
            for (const element of res.body.datas) {
                const deleteOne = await chai.request(app)
                    .delete(`/api/v2/supplier/${element._id}`)
                    .set('authorization', credentials.token);
                expect(deleteOne).to.have.status(200);
            }
        });
        it('Try delete a supplier ut fail (no authentication)', async () => {
            const supplier = await createSuppliers();
            const res      = await chai.request(app)
                .delete(`/api/v2/supplier/${supplier._id}`);
            expect(res).to.have.status(401);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('Unauthorized');
        });
        it('Try delete a supplier with a (wrong) ID and fail', async () => {
            await createSuppliers();
            const res = await chai.request(app)
                .delete('/api/v2/supplier/111111111111111111111111')
                .set('authorization', credentials.token);
            expect(res).to.have.status(200);
            expect(Object.keys(res.body).length).to.be.equal(0);
        });
    });
});