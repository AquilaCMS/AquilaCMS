/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose     = require('mongoose');
const {encryption} = require('../../utils');

const Schema = mongoose.Schema;

const ConfigurationSchema = new Schema({
    name    : String,
    licence : {
        registryKey : {type: String},
        lastCheck   : {type: Date}
    },
    environment : {
        adminPrefix       : {type: String, required: true, minlength: 1},
        analytics         : {type: String},
        appUrl            : {type: String, required: true},
        authorizedIPs     : {type: String, default: ''},
        autoMaintenance   : {type: Boolean, default: false},
        billsPattern      : {type: String},
        logPath           : {type: String},
        errorPath         : {type: String},
        favicon           : {type: String},
        cacheTTL          : {type: Number},
        currentTheme      : {type: String, required: true},
        demoMode          : {type: Boolean, default: true},
        exchangeFilesPath : {type: String},
        invoicePath       : {type: String},
        mailHost          : {type: String},
        mailPass          : {type: String},
        mailPort          : {type: Number},
        mailUser          : {type: String},
        mailSecure        : {type: Boolean, default: false},
        mailIsSendmail    : {type: Boolean, default: false},
        maintenance       : {type: Boolean, default: false},
        overrideSendTo    : {type: String},
        photoPath         : {type: String},
        sendMetrics       : {
            active   : {type: Boolean, default: true},
            lastSent : {type: Date}
        },
        siteName              : {type: String, required: true},
        websiteCountry        : {type: String, required: true},
        websiteTimezone       : {type: String},
        migration             : {type: Number},
        contentSecurityPolicy : {
            values : {type: [String]},
            active : {type: Boolean, default: false}
        }

    },
    taxerate : {
        type : [
            {rate: {type: Number, required: true}}
        ],
        default : [{rate: 5.5}, {rate: 10}, {rate: 20}]
    },
    stockOrder : {
        cartExpireTimeout         : {type: Number, required: true, default: 48},
        pendingOrderCancelTimeout : {type: Number, required: true, default: 48},
        requestMailPendingCarts   : {type: Number, required: true, default: 24},
        bookingStock              : {type: String, required: true, enum: ['commande', 'panier', 'none', 'payment']},
        labels                    : {
            type    : [{code: {type: String, required: true}, translation: {}}],
            default : [
                {
                    code        : 'available',
                    translation : {
                        fr : {value: 'Produit disponible'},
                        en : {value: 'Available product'}
                    }
                },
                {
                    code        : 'availableFrom',
                    translation : {
                        en : {value: 'Available from {date}'},
                        fr : {value: 'Disponible à partir du {date}'}
                    }
                },
                {
                    code        : 'replenished',
                    translation : {
                        en : {value: 'Product being replenished'},
                        fr : {value: 'Produit en cours de réapprovisionnement'}
                    }
                },
                {
                    code        : 'exhausted',
                    translation : {
                        en : {value: 'Product permanently exhausted'},
                        fr : {value: 'Produit définitivement épuisé'}
                    }
                }
            ]},
        additionnalFees : {
            tax : {type: Number, default: 0},
            et  : {type: Number, default: 0}
        },
        returnStockToFront : {type: Boolean, default: false},
        automaticBilling   : {type: Boolean, default: false}
    }
}, {
    id : false
});

ConfigurationSchema.post('updateOne', async function () {
    const update = this.getUpdate().$set;
    if (update.environment && update.environment.mailPass) {
        try {
            update.environment.mailPass = encryption.cipher(update.environment.mailPass);
        } catch (err) {
            console.error(err);
        }
    }
    global.envConfig = (await this.findOne({})).toObject();
});

ConfigurationSchema.post('findOne', async function (doc) {
    if (doc.environment && doc.environment.mailPass) {
        try {
            doc.environment.mailPass = encryption.decipher(doc.environment.mailPass);
        // eslint-disable-next-line no-empty
        } catch (err) {}
    }
});

module.exports = ConfigurationSchema;