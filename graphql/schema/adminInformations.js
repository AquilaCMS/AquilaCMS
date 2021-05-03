const types = `
    type adminInformations {
        code: String
        type: String
        translation: Any
        date: Date
        deleted: Boolean
    }
`;

const queries = `
    getAdminInformation: adminInformations!
`;

module.exports = {
    types,
    queries
};