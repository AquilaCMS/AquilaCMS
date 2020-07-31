const {Suppliers, Products} = require('../orm/models');
const QueryBuilder          = require('../utils/QueryBuilder');
const NSErrors              = require('../utils/errors/NSErrors');

const restrictedFields      = [];
const defaultFields         = ['*'];
const queryBuilder          = new QueryBuilder(Suppliers, restrictedFields, defaultFields);

exports.listSuppliers = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

exports.getSupplier = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};

exports.saveSupplier = async function (_new) {
    if (!_new) throw NSErrors.UnprocessableEntity;
    if (_new._id) {
        return Suppliers.findOneAndUpdate({_id: _new._id}, _new);
    }
    return Suppliers.create(_new);
};

exports.deleteSupplier = async function (_id) {
    if (!_id) throw NSErrors.UnprocessableEntity;
    const result = await Suppliers.deleteOne({_id});
    await Products.updateMany({supplier_ref: _id}, {$unset: {supplier_ref: ''}});
    return result.ok === 1;
};