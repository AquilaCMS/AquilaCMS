const faker    = require('faker');
const {Medias} = require('../../orm/models');

const createMedias = (params = {name: null}) => {
    const {name} = params;
    const medias = new Medias();
    medias.link  = '';
    medias.name  = name || faker.lorem.slug();
    medias.group = '';
    return medias.save();
};

const deleteAllMedias = async () => {
    await Medias.deleteMany({});
};

module.exports = {
    createMedias,
    deleteAllMedias
};