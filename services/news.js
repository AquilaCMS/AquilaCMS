const {News}           = require("../orm/models");
const QueryBuilder     = require("../utils/QueryBuilder");
const NSErrors         = require("../utils/errors/NSErrors");

const restrictedFields = [];
const defaultFields    = ["*"];
const queryBuilder     = new QueryBuilder(News, restrictedFields, defaultFields);

exports.getNews = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

exports.getNew = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};

exports.saveNew = async function (_new) {
    if (!_new) throw NSErrors.UnprocessableEntity;
    if (_new._id) {
        return News.findOneAndUpdate({_id: _new._id}, _new);
    }
    return News.create(_new);
};

exports.deleteNew = async function (_id) {
    if (!_id) throw NSErrors.UnprocessableEntity;
    const result = await News.deleteOne({_id});
    return result.ok === 1;
};