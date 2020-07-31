const {Statics}        = require('../orm/models');
const QueryBuilder     = require('../utils/QueryBuilder');
const NSErrors         = require('../utils/errors/NSErrors');

const restrictedFields = ['group'];
const defaultFields    = ['_id', 'code', 'translation'];
const queryBuilder     = new QueryBuilder(Statics, restrictedFields, defaultFields);

const getStatics = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const getStatic = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const getStaticById = async (id, PostBody = null) => {
    return queryBuilder.findById(id, PostBody);
};

const setStatic = async (req) => {
    return Statics.updateOne({_id: req.body._id}, req.body);
};

const createStatic = async (req) => {
    return Statics.create(req.body);
};

const deleteStatic = async (req) => {
    const statics = await Statics.findOne({_id: req.params.id});
    if (!statics) throw NSErrors.StaticNotFound;
    const isRemoved = await statics.remove();
    return {status: isRemoved};
};

module.exports = {
    getStatics,
    getStatic,
    getStaticById,
    setStatic,
    createStatic,
    deleteStatic
};