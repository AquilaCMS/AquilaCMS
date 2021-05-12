/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getMedia : async (parent, {id}, context, info) => {
            const {Medias} = require('../../orm/models');
            return Medias.findById(id).lean();
        },
        getMedias : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Medias} = require('../../orm/models');
            return Medias.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;