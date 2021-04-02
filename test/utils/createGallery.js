const faker     = require('faker');
const {Gallery} = require('../../orm/models');

const createGallery = (params = {code: null}) => {
    const {code}            = params;
    const gallery           = new Gallery();
    gallery.initItemNumber  = 12;
    gallery.maxColumnNumber = 4;
    gallery.code            = code || faker.lorem.slug();
    return gallery.save();
};

const deleteAllGallery = async () => {
    await Gallery.deleteMany({});
};

module.exports = {
    createGallery,
    deleteAllGallery
};