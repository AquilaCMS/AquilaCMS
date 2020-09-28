const {News}       = require('../orm/models');
const QueryBuilder = require('../utils/QueryBuilder');
const NSErrors     = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(News, restrictedFields, defaultFields);

const getNews = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const getNew = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const saveNew = async (_new) => {
    if (!_new) throw NSErrors.UnprocessableEntity;
    if (_new._id) {
        return News.findOneAndUpdate({_id: _new._id}, _new);
    }
    return News.create(_new);
};

const deleteNew = async (_id) => {
    if (!_id) throw NSErrors.UnprocessableEntity;
    const result = await News.deleteOne({_id});
    return result.ok === 1;
};

module.exports = {
    getNews,
    getNew,
    saveNew,
    deleteNew
};