/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    Query : {
        getContact : async (parent, {id}, context, info) => {
            const {Contacts} = require('../../orm/models');
            return Contacts.findById(id).lean();
        },
        getContacts : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Contacts} = require('../../orm/models');
            return Contacts.find(conditions).skip(offset).limit(limit).lean();
        }
    },
    Mutation : {
        setContact : async (root, {id, contact}, context, info) => {
            const {Contacts} = require('../../orm/models');
            let _contact     = await Contacts.findById(id).lean();
            if (!contact) {
                throw NSErrors.ContactNotFound;
            }
            _contact = {..._contact, ...contact};
            return Contacts.updateOne({_id: id}, {$set: _contact});
        }
    }
};

module.exports = resolvers;