const faker   = require('faker');
const {Users} = require('../../orm/models');

const createAccountAndLogin = async () => {
    const doc  = {
        email           : faker.internet.email(),
        firstName       : faker.name.firstName(),
        lastName        : faker.name.lastName(),
        isAdmin         : false,
        isActive        : true,
        isActiveAccount : true
    };
    const user = new Users(doc);
    await user.save();
};

module.exports = createAccountAndLogin;