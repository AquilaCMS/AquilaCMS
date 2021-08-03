const types = `
    type User {
        _id: ObjectId!
        email: String!
        code: String
        active: Boolean
        civility: Int
        firstname: String
        lastname: String
        phone: String
        phone_mobile: String
        company: Company
        status: String
        creationDate: Date
        delivery_address: Int
        billing_address: Int
        addresses: [Address]
        isAdmin: Boolean
        campaign: Campaign
        price: String
        taxDisplay: Boolean
        paymentChoice: String
        isActiveAccount: Boolean
        activateAccountToken: String
        resetPassToken: String
        migrated: Boolean
        birthDate: Date
        presentInLastImport: Boolean
        accessList: [String]
        details: Any
        type: String
        preferredLanguage: String
        set_attributes(id: String): SetAttribute
        attributes: [UserAttributes]
    }

    type Campaign {
        referer: String
        utm_campaign: String
        utm_medium: String
        utm_source: String
        utm_content: String
        utm_term: String
    }

    type Company {
        name: String
        siret: String
        intracom: String
        address: String
        postal_code: String
        town: String
        country: String
        contact: Contact
    }

    type Contact {
        first_name: String
        last_name: String
        email: String
        phone: String
    }

    type UserAttributes {
        id(id: String): Attribute
        code: String
        values: String
        param: String
        type: String
        translation: Any
        position: Int
    }

    input UserInput {
        _id: ObjectId!
        email: String!
        code: String
        active: Boolean
        civility: Int
        firstname: String
        lastname: String
        phone: String
        phone_mobile: String
        company: CompanyInput
        status: String
        creationDate: Date
        delivery_address: Int
        billing_address: Int
        addresses: [AddressInput]
        isAdmin: Boolean
        campaign: CampaignInput
        price: String
        taxDisplay: Boolean
        paymentChoice: String
        isActiveAccount: Boolean
        activateAccountToken: String
        resetPassToken: String
        migrated: Boolean
        birthDate: Date
        presentInLastImport: Boolean
        accessList: [String]
        details: Any
        type: String
        preferredLanguage: String
    }

    input CampaignInput {
        referer: String
        utm_campaign: String
        utm_medium: String
        utm_source: String
        utm_content: String
        utm_term: String
    }

    input CompanyInput {
        name: String
        siret: String
        intracom: String
        address: String
        postal_code: String
        town: String
        country: String
        contact: ContactInput
    }

    input ContactInput {
        first_name: String
        last_name: String
        email: String
        phone: String
    }
`;

const queries = `
    getUser(id: String!): User! @isAuth(requires: ADMIN)
    getUsers(offset: Int, limit: Int, conditions: Any): [User]!
`;

const mutations = `
    createUser(user: UserInput!): User!
    updateUser(id: String!, user: UserInput!): User! @isAuth(requires: ADMIN)
`;

module.exports = {
    types,
    queries,
    mutations
};