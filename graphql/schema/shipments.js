const types = `
    type shipment {
        code: String
        type: String
        active: Boolean
        translation: Any,
        countries: [country],
        url_logo: String
        preparation : preparation
        address : Address
        freePriceLimit: Float
        vat_rate: Float
        forAllPos: Boolean
        component_template: String
        component_template_front: String
    }

    type preparation {
        delay: Int
        unit: String
    }

    type country {
        country: String
        delay: Int
        unit: String
        prices: [price]
    }

    type price {
        weight_min: Float
        weight_max: Float
        price: Float
    }
`;

const queries = `
    getShipment: shipment!
    getShipments: [shipment]!
`;

module.exports = {
    types,
    queries
};