/* eslint-disable no-unused-vars */
const {NSErrors} = require('../../utils');

const resolvers = {
    User : {
        set_attributes : async (user) => {
            const {SetAttributes} = require('../../orm/models');
            return SetAttributes.findById(user.set_attributes).lean() || null;
        }
    },
    UserAttributes : {
        id : async (userAttribute, args, context, info) => {
            const {Attributes} = require('../../orm/models');
            return Attributes.findById(userAttribute.id).lean() || null;
        }
    },
    Query : {
        getUser : async (parent, {id}, context, info) => {
            const {Users} = require('../../orm/models');
            return Users.findById(id).lean();
        },
        getUsers : async (parent, {offset = 0, limit = 10, conditions = {}}) => {
            const {Users} = require('../../orm/models');
            return Users.find(conditions).skip(offset).limit(limit).lean();
        }
    },
    Mutation : {
        updateUser : async (root, {id, user}, context, info) => {
            const {Users} = require('../../orm/models');
            let _user     = await Users.findById(id).lean();
            if (!user) throw NSErrors.UserNotFound;
            _user = {..._user, ...user};
            return Users.updateOne({_id: id}, {$set: _user});
        },
        createUser : async (root, {user}, context, info) => {
            const {Users} = require('../../orm/models');
            const _user   = await Users.findOne({email: user.email}).lean();
            if (!user) throw NSErrors.UserNotFound;
        }
    }
};

module.exports = resolvers;