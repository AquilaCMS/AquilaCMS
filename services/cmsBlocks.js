const {CmsBlocks}  = require('../orm/models');
const QueryBuilder = require('../utils/QueryBuilder');
const NSErrors     = require('../utils/errors/NSErrors');

const restrictedFields = ['group'];
const defaultFields    = ['_id', 'code', 'translation'];
const queryBuilder     = new QueryBuilder(CmsBlocks, restrictedFields, defaultFields);

const getCMSBlocks = async (PostBody) => {
    return queryBuilder.find(PostBody);
};
const getCMSBlock  = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const getCMSBlockById = async (id, PostBody = null) => {
    return queryBuilder.findOne(id, PostBody);
};

const setCMSBlock = async (body) => {
    if (body._id) return CmsBlocks.updateOne({_id: body._id}, body);
    return CmsBlocks.create(body);
};

const deleteCMSBlock = async (code) => {
    const doc = await CmsBlocks.findOneAndRemove({code});
    if (!doc) throw NSErrors.CmsBlockNotFound;
    return doc;
};

module.exports = {
    getCMSBlocks,
    getCMSBlock,
    getCMSBlockById,
    setCMSBlock,
    deleteCMSBlock
};