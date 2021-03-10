const faker   = require('faker');
const {Users} = require('../../orm/models');

const createAccountAndLogin = (email = null, password = null, admin = false) => {
    const user           = new Users();
    user.email           = email || faker.internet.email();
    user.firstName       = faker.name.firstName();
    user.lastName        = faker.name.lastName();
    user.isAdmin         = admin;
    user.isActive        = true;
    user.isActiveAccount = true;
    if (password) {
        user.password = password;
    }
    return user.save();
};

module.exports = createAccountAndLogin;