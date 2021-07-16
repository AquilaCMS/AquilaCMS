/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getLang : async (parent, {id}, context, info) => {
            const {Languages} = require('../../orm/models');
            return Languages.findById(id).lean();
        },
        listLangs : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Languages} = require('../../orm/models');
            return Languages.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;