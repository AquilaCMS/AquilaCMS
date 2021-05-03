const types = `
    type Media {
        _id: ObjectId!
        name: String
        link: String
        group: String
        extension : String
    }
`;

const queries = `
    getMedia(id: String!): Media!
    listMedias(offset: Int, limit: Int, conditions: Any): [Media]!
`;

module.exports = {
    types,
    queries
};