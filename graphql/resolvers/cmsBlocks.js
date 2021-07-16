/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getCMSBlock : async (parent, {id}, context, info) => {
            const {cmsBlocks} = require('../../orm/models');
            return cmsBlocks.findById(id).lean();
        },
        getCMSBlocks : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {cmsBlocks} = require('../../orm/models');
            return cmsBlocks.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;