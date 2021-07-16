const types = `
    type Static {
        _id: ObjectId!
        code: String!
        type: String!
        group: String
    }
`;

const queries = `
    getStatic(id: String!): Static!
    getStatics(offset: Int, limit: Int, conditions: Any): [Static]!
`;

module.exports = {
    types,
    queries
};