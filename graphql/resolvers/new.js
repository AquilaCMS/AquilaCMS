/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getNew : async (parent, {id}, context, info) => {
            const {News} = require('../../orm/models');
            return News.findById(id).lean();
        },
        getNews : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {News} = require('../../orm/models');
            return News.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;