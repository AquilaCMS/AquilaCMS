const faker       = require('faker');
const {Territory} = require('../../orm/models');

const createTerritory = (params = {name: null, code: null, taxeFree: null}) => {
    const {name, code, taxeFree} = params;
    const territory              = new Territory();
    territory.taxeFree           = taxeFree || faker.datatype.boolean();
    territory.code               = code || faker.lorem.slug();
    territory.name               = '';
    territory.translation        = {
        fr : {
            name : name || faker.lorem.slug()
        }
    };
    return territory.save();
};

const deleteAllTerritory = async () => {
    await Territory.deleteMany({});
};

module.exports = {
    createTerritory,
    deleteAllTerritory
};