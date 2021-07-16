const types = `
    type shipment {
        code: String
        type: shipmentType
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

    enum shipmentType {
        DELIVERY
        RELAY_POINT
    }

    type preparation {
        delay: Int
        unit: String
    }

    type country {
        country: String
        delay: Int
        unit: String
        prices: [countryPrice]
    }

    type countryPrice {
        weight_min: Float
        weight_max: Float
        price: Float
    }
`;

const queries = `
    getShipment(code: String): shipment!
    getShipments(offset: Int, limit: Int, conditions: Any): [shipment]!
`;

module.exports = {
    types,
    queries
};