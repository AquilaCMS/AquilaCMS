/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getSupplier : async (parent, {id}, context, info) => {
            const {Suppliers} = require('../../orm/models');
            return Suppliers.findById(id).lean();
        },
        getSuppliers : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Suppliers} = require('../../orm/models');
            return Suppliers.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;