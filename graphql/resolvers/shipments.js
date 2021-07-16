/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getShipment : async (parent, {id}, context, info) => {
            const {Shipments} = require('../../orm/models');
            return Shipments.findById(id).lean();
        },
        getShipments : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Shipments} = require('../../orm/models');
            return Shipments.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;