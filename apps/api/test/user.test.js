const chai                    = require('chai');
const chaiHttp                = require('chai-http');
const {Users}                 = require('../orm/models');
const app                     = require('../server');
const createUserAdminAndLogin = require('./utils/createUserAdminAndLogin');
const createUser              = require('./utils/createUser');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Users', () => {
    beforeEach(async () => {
        credentials = await createUserAdminAndLogin();
    });

    describe('POST /api/v2/users', () => {
        it('All users w/o admin auth', (done) => {
            chai.request(app)
                .post('/api/v2/users')
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    expect(res.body.code).be.equals('Unauthorized');
                    done();
                });
        });

        it('All users w/ auth admin', (done) => {
            chai.request(app)
                .post('/api/v2/users')
                .set('authorization', credentials.token)
                .send({PostBody: {}})
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    done();
                });
        });
    });

    describe('POST /api/v2/user', () => {
        it('Should get current admin user', (done) => {
            chai.request(app)
                .post('/api/v2/user')
                .set('authorization', credentials.token)
                .send({PostBody: {}})
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(200);
                    done();
                });
        });
    });

    describe('POST /api/v2/user/resetpassword/:lang', () => {
        it('should not throw an error to reset password w/o data', (done) => {
            chai.request(app)
                .post('/api/v2/user/resetpassword')
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(500);
                    expect(res.body).to.have.property('message');
                    expect(res.body.message).to.be.equal('Aucun token ou adresse e-mail trouvé.');
                    done();
                });
        });

        it('should generate new token reset password', (done) => {
            chai.request(app)
                .post('/api/v2/user/resetpassword')
                .send({email: credentials.user.email, sendMail: false})
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body.message).to.be.equal(credentials.user.email);
                    done();
                });
        });
    });

    describe('POST /api/v2/user/:id', () => {
        it('should not get user w/o authentication', (done) => {
            chai.request(app)
                .post(`/api/v2/user/${credentials.user._id}`)
                .send({PostBody: {filter: {_id: credentials.user._id}}}) // TODO : no need to send it
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(401);
                    expect(res.body).have.property('code');
                    expect(res.body.code).to.be.equal('Unauthorized');
                    done();
                });
        });

        it('should get admin user w/ token admin', (done) => {
            chai.request(app)
                .post(`/api/v2/user/${credentials.user._id}`)
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: credentials.user._id}}}) // TODO : no need to send it
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(200);
                    expect(res.body).have.property('email');
                    expect(res.body.email).to.be.equal(credentials.user.email);
                    done();
                });
        });

        it('should get user w/ token admin', async () => {
            const user = await createUser();
            const res  = await chai.request(app)
                .post(`/api/v2/user/${user._id}`)
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {_id: user._id}}});
            expect(res).to.have.status(200);
            expect(res.body).have.property('email');
            expect(res.body.email).to.be.equal(user.email);
        });
    });

    describe('POST /api/v2/user/active/account', () => {
        it('should get user admin w/ his activateAccountToken', async () => {
            const {activateAccountToken} = await Users.findById(credentials.user._id);

            const res = await chai.request(app)
                .post('/api/v2/user/active/account')
                .set('authorization', credentials.token)
                .send({activateAccountToken});
            expect(res).to.have.status(200);
            expect(res.body.isActiveAccount).to.be.equal(true);
        });
    });

    describe('PUT /api/v2/user/addresses', () => {

    });

    describe('PUT /api/v2/user', () => {

    });

    describe('DELETE /api/v2/user/:id', () => {
        beforeEach(async () => {
            await Users.deleteMany({isAdmin: false});
            await createUser();
        });
    });

    describe('POST /api/v2/getUserTypes', () => {
        it('should not be accessible w/o admin token', (done) => {
            chai.request(app)
                .post('/api/v2/getUserTypes')
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(401);
                    expect(res.body).have.property('code');
                    expect(res.body.code).to.be.equal('Unauthorized');
                    done();
                });
        });
    });
});