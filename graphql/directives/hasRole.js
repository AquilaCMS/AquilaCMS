const {
    GraphQLDirective,
    DirectiveLocation,
    GraphQLList,
    defaultFieldResolver
} = require('graphql');
const {SchemaDirectiveVisitor} = require('apollo-server-express');
const {NSErrors}               = require('../../utils');
const {authentication}         = require('../../middleware/authentication');

class HasRoleDirective extends SchemaDirectiveVisitor {
    static getDirectiveDeclaration(directiveName, schema) {
        return new GraphQLDirective({
            name      : 'hasRole',
            locations : [DirectiveLocation.FIELD_DEFINITION],
            args      : {
                roles : {
                    type : new GraphQLList(schema.getType('Role'))
                }
            }
        });
    }
    visitFieldDefinition(field) {
        const {resolve = defaultFieldResolver} = field;
        const roles                            = this.args.roles;
        field.resolve                          = async function (...args) {
            const [, , context] = args;
            await authentication(context);
            // const {isAdmin} = context.req.info;
            const userRoles = context.me.role;

            if (roles.some((role) => userRoles.indexOf(role) !== -1)) {
                const result = await resolve.apply(this, args);
                return result;
            }
            throw NSErrors.AccessUnauthorized;
        };
    }
}
module.exports = HasRoleDirective;