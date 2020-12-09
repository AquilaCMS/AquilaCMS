const {SchemaDirectiveVisitor} = require('apollo-server-express');
const {defaultFieldResolver}   = require('graphql');
const {authentication}         = require('../../middleware/authentication');

class AuthDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field) {
        const {resolve = defaultFieldResolver} = field;

        field.resolve = async function (...args) {
            const [, , context] = args;
            await authentication(context.req, context.res);
            return resolve.apply(this, args);
        };
    }
}

module.exports = AuthDirective;