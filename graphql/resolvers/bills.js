/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getBills : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Bills} = require('../../orm/models');
            return Bills.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;