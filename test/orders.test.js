const chai                            = require('chai');
const chaiHttp                        = require('chai-http');
const app                             = require('../server');
const createUserAdminAndLogin         = require('./utils/createUserAdminAndLogin');
const {createOrders, deleteAllOrders} = require('./utils/createOrders');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Orders', () => {
    beforeEach(async () => {
        await deleteAllOrders();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/orders', () => {
        it('Should create an order and get it with the id', async () => {
            const order = await createOrders();
            const res   = await chai.request(app)
                .post('/api/v2/orders')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: order._id}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas[0].code).be.equals(order.code);
        });
        it('Should create an order and try get it with the id (no authentication)', async () => {
            const order = await createOrders();
            const res   = await chai.request(app)
                .post('/api/v2/orders')
                .send({PostBody: {filter: {_id: order._id}, limit: 99}});
            expect(res).to.have.status(403);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('AccessUnauthorized');
        });
        it('Should create an order and try get it with a (wrong) ID', async () => {
            await createOrders();
            const res = await chai.request(app)
                .post('/api/v2/orders')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas.length).to.be.equal(0);
            expect(res.body.count).to.be.equal(0);
        });
    });
});