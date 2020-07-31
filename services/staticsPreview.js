const ModelPreview     = require('../orm/models/staticsPreview');
const QueryBuilder     = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = ['_id', 'code', 'translation'];
const queryBuilder     = new QueryBuilder(ModelPreview, restrictedFields, defaultFields);

const getStaticsPreview = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const getStaticPreview = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const getStaticPreviewById = async (_id) => {
    return getStaticPreview({filter: {_id}});
};

const deletePreview = async (code) => {
    return ModelPreview.deleteOne({code});
};

module.exports = {
    getStaticsPreview,
    getStaticPreview,
    getStaticPreviewById,
    deletePreview
};
