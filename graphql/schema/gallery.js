const types = `
    type Gallery {
        _id: ObjectId!
        code: String!
        initItemNumber: Int
        maxColumnNumber: Int
        items: [item]
    }

    type item {
        _id: ObjectId!
        src: String
        srcset: String
        sizes: String
        content: String
        alt: String
        order: Int
        extension: String
    }
`;

const queries = `
    getGallery(id: String!): Gallery!
    getGalleries(offset: Int, limit: Int, conditions: Any): [Gallery]!
`;

module.exports = {
    types,
    queries
};