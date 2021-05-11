/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getPaymentMethod : async (parent, {id}, context, info) => {
            const {PaymentMethods} = require('../../orm/models');
            return PaymentMethods.findById(id).lean();
        },
        getPaymentMethods : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {PaymentMethods} = require('../../orm/models');
            return PaymentMethods.find(conditions).skip(offset).limit(limit).lean();
        }
    }
};

module.exports = resolvers;