const faker   = require('faker');
const {News} = require('../../orm/models');

const createNews = (slug = null) => {
    const news           = new News();
    news.translation     = {
        fr: {
            slug  : slug || faker.lorem.slug(),
            title : faker.name.title(),
            content: {
                resume: "",
                test: ""
            }
        }
    };
    return news.save();
};

module.exports = createNews;