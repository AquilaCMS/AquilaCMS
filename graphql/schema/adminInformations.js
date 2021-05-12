const types = `
    type adminInformations {
        code: String
        type: adminInformationType
        translation: Any
        date: Date
        deleted: Boolean
    }

    enum adminInformationType {
        success
        info
        warning
        danger
    }
`;

const queries = `
    getAdminInformations: [adminInformations]!
`;

module.exports = {
    types,
    queries
};