const chai                          = require('chai');
const chaiHttp                      = require('chai-http');
const app                           = require('../server');
const createUserAdminAndLogin       = require('./utils/createUserAdminAndLogin');
const {createBills, deleteAllBills} = require('./utils/createBills');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Bills', () => {
    beforeEach(async () => {
        await deleteAllBills();
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/bills', () => {
        it('Should bill and get it with the code', async () => {
            const bill = await createBills();
            const res  = await chai.request(app)
                .post('/api/v2/bills')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {code: bill.code}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas[0].name).be.equals(bill.name);
        });
        it('Should not retrieve bill if no authorization token send', async () => {
            const bill = await createBills();
            const res  = await chai.request(app)
                .post('/api/v2/bills')
                .send({PostBody: {filter: {_id: bill._id}, limit: 99}});
            expect(res).to.have.status(403);
            expect(res.body).have.property('code');
            expect(res.body.code).to.be.equal('AccessUnauthorized');
        });
        it('Should create a bill and don t get it when sending a wrong id', async () => {
            await createBills();
            const res = await chai.request(app)
                .post('/api/v2/bills')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: '111111111111111111111111'}, limit: 99}});
            expect(res).to.have.status(200);
            expect(res.body.datas.length).to.be.equal(0);
            expect(res.body.count).to.be.equal(0);
        });
    });
    describe('POST /api/v2/bills/generatePDF', () => {
        it('Generate PDF of bills', async () => {
            const bill = await createBills();
            const res  = await chai.request(app)
                .post('/api/v2/bills/generatePDF')
                .set('authorization', credentials.token)
                .send({PostBody: {structure: {__v: 0}, filter: {_id: bill._id}}});
            expect(res).to.have.status(500);
        });
        it('Should not retrieve bill if no authorization token send', async () => {
            const bill = await createBills();
            const res  = await chai.request(app)
                .post('/api/v2/bill')
                .send({PostBody: {structure: {__v: 0}, filter: {_id: bill._id}}});
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('code');
            expect(res.body.code).to.be.equal('ApiNotFound');
        });
    });
});