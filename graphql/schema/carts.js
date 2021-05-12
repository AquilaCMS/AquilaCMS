const types = `
    type cart {
        updated :Date
        paidTax: Boolean
        status: cartStatus
        promos: [promo]
        customer: customer
        addresses: cartAddresses
        comment: String
        items: [ItemSchema]
        discount : [discount]
        delivery : cartDelivery
        orderReceipt: orderReceipt
    }

    type cartDelivery {
        method: ObjectId
        value: price
        freePriceLimit: Float
        code: String
        name: String
        url: String
        date: Date
        dateDelivery: dateDelivery
    }

    type dateDelivery {
        delayDelivery: Int
        unitDelivery: String
        delayPreparation: Int
        unitPreparation: String
    }

    enum cartStatus {
        IN_PROGRESS
        EXPIRING
        EXPIRED
    }
    
    type orderReceipt {
        method: orderReceiptMethod
        date: Date
    }

    enum orderReceiptMethod {
        delivery
        withdrawal
    }

    type customer {
        id: ObjectId
        email: String
        phone: String
    }

    type cartAddresses {
        delivery : Address
        billing  : Address
    }

    type discount {
        code: String
        type: discountType
        value: Float
        description: String
        minimumATI: Float
        onAllSite: Boolean
        openDate: Date
        closeDate: Date
        priceATI: Float!
    }

    enum discountType {
        PERCENT
        PRICE
        FREE_DELIVERY
    }
`;

const queries = `
    getCarts(offset: Int, limit: Int, conditions: Any): [cart]!
`;

module.exports = {
    types,
    queries
};