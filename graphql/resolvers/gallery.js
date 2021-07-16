/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getGallery : async (parent, {id}, context, info) => {
            const {Gallery} = require('../../orm/models');
            return Gallery.findById(id).lean();
        },
        getGalleries : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Gallery} = require('../../orm/models');
            return Gallery.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;