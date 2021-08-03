/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getTerritory : async (parent, {id}, context, info) => {
            const {Territory} = require('../../orm/models');
            return Territory.findById(id).lean();
        },
        getTerritories : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Territory} = require('../../orm/models');
            return Territory.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;