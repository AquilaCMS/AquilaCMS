const types = `
    type CMSBlock {
        _id: ObjectId!
        code: String!
        group: String
        description : String
    }
`;

const queries = `
    getCMSBlock(id: String!): CMSBlock!
    getCMSBlocks(offset: Int, limit: Int, conditions: Any): [CMSBlock]!
`;

module.exports = {
    types,
    queries
};