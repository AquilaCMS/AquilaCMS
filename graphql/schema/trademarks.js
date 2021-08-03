const types = `
    type trademark {
        code: String
        name: String!
        active: Boolean
    }
`;

const queries = `
    getTrademark(name: String!): trademark!
    getTrademarks(offset: Int, limit: Int, conditions: Any): [trademark]!
`;

module.exports = {
    types,
    queries
};