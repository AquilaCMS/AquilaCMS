const {SchemaDirectiveVisitor} = require('apollo-server-express');
const {defaultFieldResolver}   = require('graphql');

class AuthDirective extends SchemaDirectiveVisitor {
    visitObject(type) {
        this.ensureFieldsWrapped(type);
        type._requiredAuthRole = this.args.requires;
    }
    // Visitor methods for nested types like fields and arguments
    // also receive a details object that provides information about
    // the parent and grandparent types.
    visitFieldDefinition(field, details) {
        this.ensureFieldsWrapped(details.objectType);
        field._requiredAuthRole = this.args.requires;
    }

    ensureFieldsWrapped(objectType) {
        // Mark the GraphQLObjectType object to avoid re-wrapping:
        if (objectType._authFieldsWrapped) return;
        objectType._authFieldsWrapped = true;

        const fields = objectType.getFields();

        Object.keys(fields).forEach((fieldName) => {
            const field                            = fields[fieldName];
            const {resolve = defaultFieldResolver} = field;
            field.resolve                          = async function (source, args, context, info) {
                // Get the required Role from the field first, falling back
                // to the objectType if no Role is required by the field:
                const requiredRole = field._requiredAuthRole || objectType._requiredAuthRole;

                if (!requiredRole) {
                    return resolve.apply(this, [source, args, context, info]);
                }

                const {user} = context;
                if ((!user || !user.isAdmin && requiredRole === 'ADMIN')) {
                    throw new Error('not authorized');
                }

                return resolve.apply(this, [source, args, context, info]);
            };
        });
    }
}

module.exports = {isAuth: AuthDirective};