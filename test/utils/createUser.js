const faker   = require('faker');
const {Users} = require('../../orm/models');

const createAccountAndLogin = () => {
    const user           = new Users();
    user.email           = faker.internet.email();
    user.firstName       = faker.name.firstName();
    user.lastName        = faker.name.lastName();
    user.isAdmin         = false;
    user.isActive        = true;
    user.isActiveAccount = true;
    return user.save();
};

module.exports = createAccountAndLogin;