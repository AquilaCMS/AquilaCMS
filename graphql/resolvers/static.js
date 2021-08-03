/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getStatic : async (parent, {id}, context, info) => {
            const {Statics} = require('../../orm/models');
            return Statics.findById(id).lean();
        },
        getStatics : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Statics} = require('../../orm/models');
            return Statics.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;