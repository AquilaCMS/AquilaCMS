/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getTrademark : async (parent, {name}, context, info) => {
            const {Trademarks} = require('../../orm/models');
            return Trademarks.find({name}).lean();
        },
        getTrademarks : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Trademarks} = require('../../orm/models');
            return Trademarks.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;