const types = `
    type paymentMethods {
        code: String!
        active: Boolean
        details: Any
        component_template: String
        makePayment: String
        isDeferred: Boolean
        sort: Int
        translation: Any
        component_template_front: String
    }
`;

const queries = `
    getPaymentMethod(code : String!): paymentMethods!
    getPaymentMethods(offset: Int, limit: Int, conditions: Any): [paymentMethods]!
`;

module.exports = {
    types,
    queries
};