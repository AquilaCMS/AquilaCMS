const types = `
    scalar Date
    scalar Any
    scalar ObjectId

    directive @isAuth(
        requires: Role = ADMIN,
    ) on OBJECT | FIELD_DEFINITION

    enum Role {
        ADMIN
        USER
    }

    enum AttributeType {
        PRODUCTS,
        USERS
    }

    enum BookingStock {
        COMMANDE
        PANIER
        NONE
        PAYMENT
    }
`;

const subscriptions = `
    tick: Int!
`;

module.exports = {
    types,
    subscriptions
};