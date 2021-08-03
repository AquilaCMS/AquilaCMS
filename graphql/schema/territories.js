const types = `
    type territory {
        translation: Any
        code: String!
        type: territoryType
        taxeFree: Boolean
        children: [ObjectId]
    }
    enum territoryType {
        country
        district
        department
        city
    }
`;

const queries = `
    getTerritory(code: String!): territory!
    getTerritories(offset: Int, limit: Int, conditions: Any): [territory]!
`;

module.exports = {
    types,
    queries
};