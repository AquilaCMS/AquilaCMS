const types = `
    type Language {
        _id: ObjectId!
        code: String!
        name: String!
        img: String
        position: Int
        defaultLanguage: Boolean
        status: String
    }
`;

const queries = `
    getLang(id: String!): Language!
    listLangs(offset: Int, limit: Int, conditions: Any): [Language]!
`;

module.exports = {
    types,
    queries
};