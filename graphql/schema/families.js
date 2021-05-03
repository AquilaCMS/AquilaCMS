const types = `
    type Family {
        _id: ObjectId!
        code: String!
        name: String!
        type: String!
        ancestors: [String]
        slug: String
        parent: ObjectId
        children: [ObjectId]
        details: Any
    }
`;

const queries = `
    getFamilies(offset: Int, limit: Int, conditions: Any): [Family]!
`;

module.exports = {
    types,
    queries
};