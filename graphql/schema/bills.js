const types = `
    type bill {
        order_id: ObjectId!
        facture: String!
        montant: String!
        withTaxes: Boolean!
        client: ObjectId!
        nom: String!
        prenom: String!
        societe: String
        coordonnees: String
        email: String!
        filename: String
        paymentDate: Date
        checksum: String
        isPaid: Boolean!
        lang: String
        items: [ItemSchema]
        taxes: Any
        address: Address,
        delivery: delivery
        promos : promo
        avoir: Boolean
        additionnalFees: additionnalFee
        priceSubTotal: priceSubTotal
    }

    type delivery {
        price: price
        code: String
        name: String
    }

    type price {
        ati: Float
        et: Float
        vat: Float
    }

    type additionnalFee {
        ati: Float
        et: Float
        tax: Float
    }

    type priceSubTotal {
        ati: Float
        et: Float
    }

    type promo {
        promoId: ObjectId
        promoCodeId: ObjectId
        discountATI: Float
        discountET: Float
        name: String
        description: String
        code: String
        productsId: [productsId]
    }

    type productsId {
        productId: ObjectId
        discountATI: Float
        discountET: Float
        basePriceET: Float
        basePriceATI: Float
    }

    type ItemSchema {
        id: ObjectId!
        status : status
        name: String
        code: String
        image: String
        parent: ObjectId
        children: [ObjectId]
        quantity: Int!
        weight: Float
        noRecalculatePrice: Boolean
        price: priceType
        atts: [Any]
        typeDisplay: String
    }

    enum status {
        PROCESSING
        DELIVERY_PROGRESS
        DELIVERY_PARTIAL_PROGRESS
        RETURNED
        RETURNED_PARTIAL
    }

    type priceType {
        vat : vat
        unit: price
        special: price
    }

    type vat {
        rate: Float!
    }
`;

const queries = `
    getBills(offset: Int, limit: Int, conditions: Any): [bill]!
`;

module.exports = {
    types,
    queries
};