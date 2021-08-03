const types = `
    type New {
        _id: ObjectId!
        isVisible: Boolean
        img: String
        extension: String
    }
`;

const queries = `
    getNew(id: String!): New!
    getNews(offset: Int, limit: Int, conditions: Any): [New]!
`;

module.exports = {
    types,
    queries
};