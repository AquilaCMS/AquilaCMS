const {Families, Products} = require('../orm/models');
const QueryBuilder         = require('../utils/QueryBuilder');
const NSErrors             = require('../utils/errors/NSErrors');

const restrictedFields     = [];
const defaultFields        = [];
const queryBuilder         = new QueryBuilder(Families, restrictedFields, defaultFields);

exports.getFamilies = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

exports.getFamily = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};

exports.saveFamily = async function (family) {
    if (!family) throw NSErrors.UnprocessableEntity;
    let _family = null;
    if (family._id) {
        _family = await Families.findOneAndUpdate({_id: family._id}, family);
    } else {
        _family = await Families.create(family);
    }
    if (family.id_parent) {
        await Families.findOneAndUpdate({_id: family.id_parent}, {$push: {children: _family._id}}, {new: true});
    }
    return _family;
};

exports.deleteFamily = async function (_id) {
    if (!_id) throw NSErrors.UnprocessableEntity;
    const result = await Families.findOneAndDelete({_id});

    // On supprime la famille de la famille parente
    await Families.updateOne({children: result._id}, {$pull: {children: result._id}});

    const where = {};
    const action = {};
    if (result.type === 'universe') {
        where.universe = result.slug;
        action.$unset = {universe: '', family: '', subfamily: ''};
    } else if (result.type === 'family') {
        where.family = result.slug;
        action.$unset = {family: '', subfamily: ''};
    } else {
        where.subfamily = result.slug;
        action.$unset = {subfamily: ''};
    }

    await Products.updateMany(where, action);

    return result.ok === 1;
};