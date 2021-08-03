const {GraphQLScalarType, GraphQLError} = require('graphql');
const {Kind}                            = require('graphql/language');
const {Types}                           = require('mongoose');

const resolvers = {
    Date : new GraphQLScalarType({
        name        : 'Date',
        description : 'Date custom scalar type',
        parseValue(value) {
            return new Date(value); // value from the client
        },
        serialize(value) {
            return value.getTime(); // value sent to the client
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.INT) {
                return parseInt(ast.value, 10); // ast value is always in string format
            }
            return null;
        }
    }),
    Any : new GraphQLScalarType({
        name         : 'Any',
        description  : 'Any value.',
        parseValue   : (value) => value,
        parseLiteral : parseLiteralAny,
        serialize    : (value) => value
    }),
    ObjectId : new GraphQLScalarType({
        name        : 'ObjectId',
        description : 'ObjectId is a mongodb ObjectId. String of 12 or 24 hex chars',
        serialize(value) {
            const result = value.toString();
            if (!Types.ObjectId.isValid(result)) {
                throw new GraphQLError(`serialize: value: ${value.toString()} is not valid ObjectId`);
            }
            return result;
        },
        parseValue(value) {
            if (!Types.ObjectId.isValid(value)) {
                throw new GraphQLError(`serialize: not a valid ObjectId, require a string with 12 or 24 hex chars, found: ${value}`);
            }

            return Types.ObjectId(value);
        },
        parseLiteral(ast) {
            if (ast.kind !== Kind.STRING) {
                throw new GraphQLError(`parseLiteral: not a valid ObjectId, require a string with 12 or 24 hex chars, found: ${ast.kind}`, [
                    ast
                ]);
            }
            const value = ast.value.toString();
            return Types.ObjectId(value);
        }
    })
};

function parseLiteralAny(ast) {
    switch (ast.kind) {
    case Kind.Date:
    case Kind.ObjectId:
    case Kind.BOOLEAN:
    case Kind.STRING:
        return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
        return Number(ast.value);
    case Kind.LIST:
        return ast.values.map(parseLiteralAny);
    case Kind.OBJECT:
        return ast.fields.reduce((accumulator, field) => {
            accumulator[field.name.value] = parseLiteralAny(field.value);
            return accumulator;
        }, {});
    case Kind.NULL:
        return null;
    default:
        throw new Error(`Unexpected kind in parseLiteral: ${ast.kind}`);
    }
}

module.exports = resolvers;