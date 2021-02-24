const types = `
    type Address {
        firstname: String!
        lastname: String!
        companyName: String
        phone: String
        phone_mobile: String
        line1: String!
        line2: String
        zipcode: String!
        city: String!
        isoCountryCode: String!
        country: String!
        complementaryInfo: String
        civility: Int
    }

    input AddressInput {
        firstname: String!
        lastname: String!
        companyName: String
        phone: String
        phone_mobile: String
        line1: String!
        line2: String
        zipcode: String!
        city: String!
        isoCountryCode: String!
        country: String!
        complementaryInfo: String
        civility: Int
    }
`;

module.exports = {
    types
};