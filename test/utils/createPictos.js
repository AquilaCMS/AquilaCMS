const faker    = require('faker');
const {Pictos} = require('../../orm/models');

const createPictos = (params = {code: null, name: null, enabled: null}) => {
    const {code, name, enabled} = params;
    const picto                 = new Pictos();
    picto.code                  = code || faker.lorem.slug();
    picto.title                 = name || faker.name.title();
    picto.location              = 'TOP_LEFT';
    picto.enabled               = enabled || false;
    picto.filename              = '';
    return picto.save();
};

const deleteAllPictos = async () => {
    await Pictos.deleteMany({});
};

module.exports = {
    createPictos,
    deleteAllPictos
};