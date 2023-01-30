/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose     = require('mongoose');
const {encryption} = require('../../utils');

const Schema = mongoose.Schema;

/* eslint-disable array-element-newline */
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
        defaultImage      : {type: String},
        cacheTTL          : {type: Number},
        currentTheme      : {type: String, required: true},
        demoMode          : {type: Boolean, default: true},
        exchangeFilesPath : {type: String},
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
        },
        needRestart    : {type: Boolean, default: false},
        needRebuild    : {type: Boolean, default: false},
        searchSettings : {
            shouldSort         : {type: Boolean, default: true},
            ignoreLocation     : {type: Boolean, default: true},
            findAllMatches     : {type: Boolean, default: true},
            ignoreFieldNorm    : {type: Boolean, default: true},
            includeScore       : {type: Boolean, default: true},
            useExtendedSearch  : {type: Boolean, default: true},
            minMatchCharLength : {type: Number, default: 2},
            threshold          : {type: Number, default: 0.2},
            keys               : {
                type    : [{name: {type: String, required: true}, weight: {type: Number, required: true}, translation: {}}],
                default : [
                    {
                        name        : 'code',
                        weight      : 20,
                        translation : {
                            fr : {
                                label : 'Code'
                            },
                            en : {
                                label : 'Code'
                            }
                        }
                    },
                    {
                        name        : 'translation.{lang}.name',
                        weight      : 10,
                        translation : {
                            fr : {
                                label : 'Nom'
                            },
                            en : {
                                label : 'Name'
                            }
                        }
                    },
                    {
                        name        : 'translation.{lang}.description1.title',
                        weight      : 3,
                        translation : {
                            fr : {
                                label : 'Titre description 1'
                            },
                            en : {
                                label : 'Title description 1'
                            }
                        }
                    },
                    {
                        name        : 'translation.{lang}.description1.text',
                        weight      : 2.5,
                        translation : {
                            fr : {
                                label : 'Texte descripiton 1'
                            },
                            en : {
                                label : 'Text descripiton 1'
                            }
                        }
                    },
                    {
                        name        : 'translation.{lang}.description2.title',
                        weight      : 2,
                        translation : {
                            fr : {
                                label : 'Titre description 2'
                            },
                            en : {
                                label : 'Title description 2'
                            }
                        }
                    },
                    {
                        name        : 'translation.{lang}.description2.text',
                        weight      : 1.5,
                        translation : {
                            fr : {
                                label : 'Texte description 2'
                            },
                            en : {
                                label : 'Text description 2'
                            }
                        }
                    }
                ]
            }
        }

    },
    taxerate : {
        type : [
            {rate: {type: Number, required: true}}
        ],
        default : [{rate: 5.5}, {rate: 10}, {rate: 20}]
    },
    stockOrder : {
        cartExpireTimeout                : {type: Number, required: true, default: 48},
        pendingOrderCancelTimeout        : {type: Number, required: true, default: 48},
        nbDaysToDeleteOlderFailedPayment : {type: Number, default: 30},
        requestMailPendingCarts          : {type: Number, required: true, default: 24},
        bookingStock                     : {type: String, required: true, enum: ['commande', 'panier', 'none', 'payment']},
        labels                           : {
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
            ]
        },
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
/* eslint-enable array-element-newline */

ConfigurationSchema.pre('updateOne', async function () {
    const update = this.getUpdate().$set;
    if (update.environment && update.environment.mailPass) {
        const databaseConfig       = (await this.findOne({})).toObject();
        const oldPasswordDecrypted = databaseConfig?.environment?.mailPass;
        try {
            if (update.environment.mailPass !== oldPasswordDecrypted) {
                update.environment.mailPass = encryption.cipher(update.environment.mailPass);
            }
        } catch (err) {
            console.error(err);
        }
    }
});

ConfigurationSchema.post('updateOne', async function () {
    global.aquila.envConfig = (await this.findOne({})).toObject();
});

ConfigurationSchema.post('findOne', async function (doc) {
    if (doc && doc.environment && doc.environment.mailPass) {
        try {
            doc.environment.mailPass = encryption.decipher(doc.environment.mailPass);
            // eslint-disable-next-line no-empty
        } catch (err) { }
    }
});

module.exports = ConfigurationSchema;