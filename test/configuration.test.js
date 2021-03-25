const chai                  = require('chai');
const chaiHttp              = require('chai-http');
const chaiThings            = require('chai-things');
const app                   = require('../server');
const createAccountAndLogin = require('./utils/createUserAdminAndLogin');

chai.use(chaiHttp);
chai.use(chaiThings);
chai.should();

const expect = chai.expect;

let credentials;

describe('Configurations', () => {
    before(async () => {
        credentials = await createAccountAndLogin();
        return credentials;
    });

    describe('POST /api/v2/config', () => {
        it('get configuration w/o user nor params', (done) => {
            chai.request(app)
                .post('/api/v2/config')
                .end((err, res) => {
                    expect(err).to.be.null;
                    res.should.have.status(200);
                    expect(res.body).to.be.an('object').to.not.have.key('licence');
                    expect(res.body.environment).to.be.an('object').to.not.have.any.keys([
                        'mailHost',
                        'mailPass',
                        'mailPort',
                        'mailUser',
                        'adminPrefix',
                        'authorizedIPs',
                        'overrideSendTo'
                    ]);
                    done();
                });
        });
    });

    describe('PUT /api/v2/config', () => {

    });

    describe('GET /robot', () => {
        it('get robot', () => {

        });
    });

    describe('POST /robot', () => {

    });
});