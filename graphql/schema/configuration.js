const types = `
    type Configuration @cacheControl(maxAge: 5) {
        _id: String!
        licence: Licence
        environment: Environment
        taxerate: Taxerate
        stockOrder: StockOrder
    }

    type Licence {
        registryCheck: String
        lastCheck: Date
    }

    type SendMetrics {
        active: Boolean
        lastSend: Date
    }

    type Environment {
        adminPrefix: String!
        analytics: String
        appUrl: String!
        authorizedIPs: String
        autoMaintenance: Boolean
        billsPattern: String
        cacheTTL: Int
        currentTheme: String!
        demoMode: Boolean
        exchangeFilesPath: String
        invoicePath: String
        mailHost: String
        mailPass: String
        mailPort: Int
        mailUser: String
        mailSecure: Boolean
        mailIsSendmail: Boolean
        maintenance: Boolean
        overrideSendTo: String
        photoPath: String
        port: Int!
        sendMetrics: SendMetrics
        siteName: String!
        websiteCountry: String!
        websiteTimezone: String
        migration: Int
    }

    type Taxerate {
        type: [Rate]
    }

    type Rate {
        rate: Int!
    }

    type StockOrder {
        cartExpireTimeout: Float!
        pendingOrderCancelTimeout: Float!
        bookingStock: BookingStock!
        labels: [Labels]
        additionnalFees: AdditionnalFees
        returnStockToFront: Boolean
        automaticBilling: Boolean
    }

    type AdditionnalFees {
        tax: Float
        et: Float
    }

    type Labels {
        code: String!
    }

    input ConfigurationInput {
        _id: ID!
        licence: LicenceInput
        environment: EnvironmentInput
        taxerate: TaxerateInput
        stockOrder: StockOrderInput
    }

    input LicenceInput {
        registryCheck: String
        lastCheck: Date
    }

    input SendMetricsInput {
        active: Boolean
        lastSend: Date
    }

    input EnvironmentInput {
        adminPrefix: String
        analytics: String
        appUrl: String
        authorizedIPs: String
        autoMaintenance: Boolean
        billsPattern: String
        cacheTTL: Int
        currentTheme: String
        demoMode: Boolean
        exchangeFilesPath: String
        invoicePath: String
        mailHost: String
        mailPass: String
        mailPort: Int
        mailUser: String
        mailSecure: Boolean
        mailIsSendmail: Boolean
        maintenance: Boolean
        overrideSendTo: String
        photoPath: String
        port: Int
        sendMetrics: SendMetricsInput
        siteName: String
        websiteCountry: String
        websiteTimezone: String
        migration: Int
    }

    input TaxerateInput {
        type: [RateInput]
    }

    input RateInput {
        rate: Int
    }

    input StockOrderInput {
        cartExpireTimeout: Float
        pendingOrderCancelTimeout: Float
        bookingStock: BookingStock
        labels: [LabelsInput]
        additionnalFees: AdditionnalFeesInput
        returnStockToFront: Boolean
        automaticBilling: Boolean
    }

    input AdditionnalFeesInput {
        tax: Float
        et: Float
    }

    input LabelsInput {
        code: String
    }
`;

const queries = `
    getConfiguration: Configuration
`;

const mutations = `
    updateConfiguration(configuration: ConfigurationInput): Configuration @isAuth(requires: ADMIN)
`;

module.exports = {
    types,
    queries,
    mutations
};