const faker  = require('faker');
const {News} = require('../../orm/models');

const createNews = (params = {slug: null}) => {
    const {slug}     = params;
    const news       = new News();
    news.translation = {
        fr : {
            slug    : slug || faker.lorem.slug(),
            title   : faker.name.title(),
            content : {
                resume : '',
                test   : ''
            }
        }
    };
    return news.save();
};

const deleteAllNews = async () => {
    await News.deleteMany({});
};

module.exports = {
    createNews,
    deleteAllNews
};