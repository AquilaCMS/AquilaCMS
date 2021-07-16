// const user          = require('./schema/user');
// const generic       = require('./schema/generic');
// const setAttribute  = require('./schema/setAttribute');
// const Attribute     = require('./schema/attribute');
// const Address       = require('./schema/address');
// const Configuration = require('./schema/configuration');

const {loadFiles} = require('@graphql-tools/load-files');

module.exports = {
    async buildSchema(paths) {
        const types         = [];
        const queries       = [];
        const mutations     = [];
        const subscriptions = [];

        const schemas = await loadFiles(paths);

        schemas.forEach((schema) => {
            if (schema.types) types.push(schema.types);
            if (schema.queries) queries.push(schema.queries);
            if (schema.mutations) mutations.push(schema.mutations);
            if (schema.subscriptions) subscriptions.push(schema.subscriptions);
        });

        return `
            ${types.join('\n')}

            type Query {
                ${queries.join('\n')}
            }

            type Mutation {
                ${mutations.join('\n')}
            }

            type Subscription {
                ${subscriptions.join('\n')}
            }
        `;
    }
};