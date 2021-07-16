/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getFamilies : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Families} = require('../../orm/models');
            return Families.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;