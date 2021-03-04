const chai                  = require('chai');
const chaiHttp              = require('chai-http');
const app                   = require('../server');
const createAccountAndLogin = require('./utils/createUserAdminAndLogin');

chai.use(chaiHttp);
chai.should();

const expect = chai.expect;

let credentials;

describe('Users', () => {
    beforeEach((done) => {
        createAccountAndLogin().then((value) => {
            credentials = value;
            done();
        });
    });

    describe('POST /api/v2/users', () => {
        it('All users w/o admin auth', (done) => {
            chai.request(app)
                .post('/api/v2/users')
                .send({PostBody: {filter: {}}})
                .end((err, res) => {
                    expect(res).have.status(401);
                    expect(res.body.code).be.equals('Unauthorized');
                    done();
                });
        });

        it('All users w/ auth admin', (done) => {
            chai.request(app)
                .post('/api/v2/users')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}}})
                .end((err, res) => {
                    expect(res).have.status(200);
                    done();
                });
        });
    });

    describe('POST /api/v2/user', () => {
        it('should get one admin user', (done) => {
            chai.request(app)
                .post('/api/v2/user')
                .set('authorization', credentials.token)
                .send({PostBody: {filter: {}}})
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).have.status(200);
                    done();
                });
        });

        // it('should fail to get the user without token and no filter', (done) => {
        //     chai.request(app)
        //         .post('/api/v2/user')
        //         .send({PostBody: {filter: {}}})
        //         .end((err, res) => {
        //             expect(err).to.be.null;
        //             expect(res).have.status(404);
        //             done();
        //         });
        // });

        // it('should fail to get the user without token and with wrong _id in filter', (done) => {
        //     chai.request(app)
        //         .post('/api/v2/user')
        //         .send({PostBody: {filter: {_id: 'fzerf65'}}})
        //         .end((err, res) => {
        //             expect(err).to.be.null;
        //             expect(res).have.status(200);
        //             done();
        //         });
        // });
    });

    describe('POST /api/v2/user/resetpassword/:lang', () => {

    });

    describe('POST /api/v2/user/:id', () => {

    });

    describe('POST /api/v2/user/active/account', () => {

    });

    describe('PUT /api/v2/user/addresses', () => {

    });

    describe('PUT /api/v2/user', () => {

    });

    describe('PUT /api/v2/user/admin', () => {

    });

    describe('DELETE /api/v2/user/:id', () => {

    });

    describe('POST /api/v2/user', () => {

    });
});