/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getCarts : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Cart} = require('../../orm/models');
            return Cart.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;