const {Territory}  = require('../orm/models');
const QueryBuilder = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Territory, restrictedFields, defaultFields);

exports.getTerritories = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

exports.getTerritory     = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};
exports.getTerritoryById = async function (id, PostBody = null) {
    return queryBuilder.findById(id, PostBody);
};

/**
 * Delete Territory
 */
exports.deleteTerritory = async function (_id) {
    await Territory.deleteOne({_id});
};

/**
 * Save or edit Territory
 */
exports.setTerritory = async function (territory) {
    const _id = territory._id;
    if (territory._id) {
        delete territory._id;
    }
    territory.type     = 'country';
    territory.children = [];

    if (typeof _id === 'undefined') {
        await Territory.create(territory);
    } else {
        await Territory.updateOne({_id}, territory);
    }
};