const crypto  = require('crypto');
const chai    = require('chai');
const faker   = require('faker');
const app     = require('../../server');
const {Users} = require('../../orm/models');

const expect = chai.expect;

const createUserAdminAndLogin = async (email = null, password = null) => {
    await Users.deleteMany({});

    const doc  = {
        email                : email || faker.internet.email(),
        password             : password || 'dm0W3#96OC',
        firstName            : faker.name.firstName(),
        lastName             : faker.name.lastName(),
        isAdmin              : true,
        isActive             : true,
        isActiveAccount      : false,
        activateAccountToken : crypto.randomBytes(26).toString('hex')
    };
    const user = new Users(doc);
    await user.save();

    const res = await chai.request(app)
        .post('/api/v2/auth/login/admin')
        .send({username: doc.email, password: doc.password});

    expect(res.body).to.have.property('code').to.eq('LOGIN_SUCCESS');
    expect(res.body).to.have.property('data');

    return {
        token : res.body.data,
        user
    };
};

module.exports = createUserAdminAndLogin;