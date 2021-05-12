const types = `
    type supplier {
        code: String!
        name: String!
        type: String
        contactPrenom: String
        contactNom: String
        addr_1: String
        addr_2: String
        cpostal: String
        city: String
        mail: String
        phone: String
        purchasing_manager: String
        active: Boolean
    }
`;

const queries = `
    getSupplier(name: String!, code: String!): supplier!
    getSuppliers(offset: Int, limit: Int, conditions: Any): [supplier]!
`;

module.exports = {
    types,
    queries
};