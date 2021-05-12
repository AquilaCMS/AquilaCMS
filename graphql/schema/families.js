const types = `
    type Family {
        _id: ObjectId!
        code: String!
        name: String!
        type: FamilyType!
        ancestors: [String]
        slug: String
        parent: ObjectId
        children: [ObjectId]
        details: Any
    }

    enum FamilyType {
        universe
        family
        subfamily
    }
`;

const queries = `
    getFamilies(offset: Int, limit: Int, conditions: Any): [Family]!
`;

module.exports = {
    types,
    queries
};