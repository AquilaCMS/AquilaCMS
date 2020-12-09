const resolvers = {
    Query : {
        getConfiguration : async () => {
            const {Configuration} = require('../../orm/models');
            return Configuration.findOne({}).lean();
        }
    },
    Mutation : {
        // eslint-disable-next-line no-unused-vars
        updateConfiguration : async (root, {configuration}, context, info) => {
            const {Configuration} = require('../../orm/models');
            return Configuration.updateOne(
                {},
                {$set: configuration},
                {new: true}
            ).lean();
        }
    }
};

module.exports = resolvers;