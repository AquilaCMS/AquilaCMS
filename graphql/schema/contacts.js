const types = `
    type Contacts {
        _id: ObjectId!
        data: Any
    }
`;

const queries = `
    getContact(id: String!): Contacts!
    getContacts(offset: Int, limit: Int, conditions: Any): [Contacts]!
`;

const mutations = `
    setContact(id: String!, user: UserInput!): Contact! @isAuth(requires: ADMIN)
`;

module.exports = {
    types,
    queries,
    mutations
};