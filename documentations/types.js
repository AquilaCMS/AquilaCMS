/**
 * @typedef {object} PostBody
 * @property {object} filter - filter - default:{}
 * @property {number} limit - limit of element to get - default:1
 * @property {array<string>} populate - fields to populate - default:[]
 * @property {number} skip - position to start the query - default:0
 * @property {object} sort - fields to order by - default:{}
 * @property {object} structure - structure - default:{}
 * @property {oneOf|null|number} page - page - default:null
 */

/**
 * @typedef {object} ResponseTerritories
 * @property {number} total.required - total of elem - default:0
 * @property {array<TerritorySchema>} datas.required - list of Territories - default:[]
 */

/**
 * @typedef {object} Environment
 * @property {boolean} autoMaintenance
 * @property {boolean} demoMode
 * @property {boolean} mailSecure
 * @property {boolean} mailIsSendmail
 * @property {boolean} maintenance
 * @property {string} appUrl
 * @property {string} currentTheme
 * @property {string} photoPath
 * @property {string} siteName
 * @property {string} websiteCountry
 * @property {string} websiteTimezone
 * @property {string} authorizedIPs
 * @property {string} mailHost
 * @property {string} mailPass
 * @property {number} mailPort
 * @property {string} mailUser
 * @property {string} overrideSendTo
 * @property {ssl} ssl
 * @property {string} databaseConnection - database connection string
 */

/**
 * @typedef {object} ssl
 * @property {string} cert
 * @property {string} key
 * @property {boolean} active
 */

/**
 * @typedef {object} Taxerate
 * @property {string} _id
 * @property {number} rate
 */

/**
 * @typedef {object} additionnalFees
 * @param {number} tax
 * @param {number} et
 */

/**
 * @typedef {object} labels
 * @property {string} _id
 * @property {object} translation
 * @property {string} code
 */

/**
 * @typedef {object} licence
 * @property {string} registryKey
 * @property {date} lastCheck
 */

/**
 * @typedef {object} stockOrder
 * @property {object} additionnalFees
 * @property {boolean} returnStockToFront
 * @property {boolean} automaticBilling
 * @property {array<labels>} labels
 * @property {number} cartExpireTimeout
 * @property {number} pendingOrderCancelTimeout
 * @property {number} supplierOrderDaysCount
 * @property {boolean} managementStock
 * @property {string} bookingStock
 */

/**
 * @typedef {object} Config
 * @property {string} _id
 * @property {Environment} environment
 * @property {stockOrder} stockOrder
 * @property {array<Taxerate>} taxerate
 */

/**
 * @typedef {object} TokenSendMail
 * @property {string} email.required
 * @property {string} lang.required
 */

/**
 * @typedef {object} changePassword
 * @property {string} email.required
 * @property {string} password.required
 */

/**
 * @typedef {object} resetPassword
 * @property {string} token.required
 * @property {string} password.required
 */