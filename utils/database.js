/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
mongoose.set('debug', false);
const NSErrors = require('./errors/NSErrors');
let connection = false;

const mongooseOptions = {
    useNewUrlParser    : true,
    useFindAndModify   : false,
    useCreateIndex     : true,
    useUnifiedTopology : true
};

const connect = async () => {
    if (!global.envFile || !global.envFile.db) {
        return mongoose;
    }
    // see : https://github.com/Automattic/mongoose/blob/master/lib/connectionstate.js
    const connectedState = [
        mongoose.STATES.connected // 1
        // mongoose.STATES.connection // 2
    ];

    const isConnected = connectedState.indexOf(mongoose.connection.readyState) !== -1;
    if (!isConnected && !connection) {
        const checkConnect = async () => new Promise((resolve, reject) => {
            mongoose.connect(global.envFile.db, mongooseOptions, (error) => {
                if (typeof error === 'undefined' || error === null) {
                    connection = true;
                    resolve(true);
                } else {
                    reject(new Error(`Unable to connect to" ${global.envFile.db}, ${error.toString()}`));
                }
            });
        });
        await checkConnect();
        mongoose.set('objectIdGetter', false);
    }
    mongoose.plugin(require('../orm/plugins/generateID'));
    return mongoose;
};

const testdb = async (uriDatabase) => new Promise((resolve, reject) => {
    mongoose.connection.close(); // need to reset the connection mongo for every try
    mongoose.connect(uriDatabase, mongooseOptions, (error) => {
        if (typeof error === 'undefined' || error === null) {
            resolve(true);
        } else {
            reject(new Error(`Unable to connect to" ${uriDatabase}, ${error.toString()}`));
        }
    });
});

/**
 * check if the database is a replicaSet, if we can use transactions
 * @deprecated
 */
/* eslint-disable-next-line no-unused-vars, arrow-body-style */
const checkIfReplicaSet = async () => {
    return new Promise(async (resolve, reject) => {
        const conn = mongoose.connection;
        conn.on('error', (err) => reject(err));
        conn.on('open', () => {
            conn.db.command({replSetGetStatus: 0}, (err) => {
                if (err) {
                    reject(err);
                }
                resolve(true);
            });
        });
    });
};

/**
 * Check if slug is unique for this collection and language
 * @param {*} doc
 * @param {mongoose.Schema<any>} model schema needed to be check for translation validation
 */
const checkSlugExist = async (doc, modelName) => {
    const query = {$or: []};
    if (!doc || !doc.translation) return;

    for (const [lang] of Object.entries(doc.translation)) {
        if (doc.translation[lang]) {
            query.$or.push({[`translation.${lang}.slug`]: doc.translation[lang].slug});
        }
    }
    if (doc._id) {
        query._id = {$nin: [doc._id]};
    }

    if (await mongoose.model(modelName).exists(query)) {
        throw NSErrors.SlugAlreadyExist;
    }
};

const checkCode = async (modelName, id, code, moreFilters = {}) => {
    if (!code) return;

    const query = {code, ...moreFilters};
    if (id) {
        query._id = {$ne: id};
    }
    if (await mongoose.model(modelName).exists(query)) {
        throw NSErrors.CodeExisting;
    }
};

const initDBValues = async () => {
    const {
        SetAttributes,
        MailType,
        Languages,
        PaymentMethods,
        Statics,
        AdminRights
    } = require('../orm/models');

    console.log('Database init : In progress...');

    /* ********** Languages ********** */
    const langs     = await Languages.find();
    let defaultLang = langs.find((l) => l.defaultLanguage);
    if (!langs.length) {
        defaultLang = new Languages({
            code            : 'fr',
            name            : 'Français',
            defaultLanguage : true,
            status          : 'visible'
        });
        await defaultLang.save();
    }
    global.defaultLang = defaultLang.code;

    /* ********** Attributes ********** */
    await SetAttributes.findOneAndUpdate(
        {code: 'defaut'},
        {$setOnInsert: {code: 'defaut', name: 'Défaut', type: 'products', attributes: []}},
        {new: true, upsert: true}
    );

    /* ********** Default staticPage ********** */
    await Statics.findOneAndUpdate({code: 'home'}, {
        $setOnInsert : {
            code        : 'home',
            type        : 'home',
            active      : true,
            translation : {[global.defaultLang]: {name: 'home', slug: 'home'}}
        }
    }, {new: true, upsert: true});

    /* ********** Mails types ********** */
    const mailTypes = [
        {
            code        : '',
            translation : {
                fr : {
                    name : 'Aucun type'
                },
                en : {
                    name : 'No type'
                }
            },
            position : 0
        },
        {
            code        : 'register',
            position    : 1,
            translation : {
                fr : {
                    name      : 'Inscription d\'un nouveau client',
                    variables : [
                        {
                            value       : 'login',
                            description : 'Login du client'
                        },
                        {
                            value       : 'firstname',
                            description : 'Prénom du client'
                        },
                        {
                            value       : 'lastname',
                            description : 'Nom du client'
                        },
                        {
                            value       : 'company',
                            description : 'Nom de la société'
                        },
                        {
                            value       : 'URL_SITE',
                            description : 'Url du site'
                        },
                        {
                            value       : 'token',
                            description : 'Token'
                        }
                    ]

                },
                en : {
                    name      : 'New customer registration',
                    variables : [
                        {
                            value       : 'login',
                            description : 'Customer login'
                        },
                        {
                            value       : 'firstname',
                            description : 'Customer firstname'
                        },
                        {
                            value       : 'lastname',
                            description : 'Customer lastname'
                        },
                        {
                            value       : 'company',
                            description : 'Company name'
                        },
                        {
                            value       : 'URL_SITE',
                            description : 'App URL'
                        },
                        {
                            value       : 'token',
                            description : 'Token'
                        }
                    ]

                }
            }
        },
        {
            code        : 'sendRegisterForAdmin',
            position    : 2,
            translation : {
                fr : {
                    name      : 'Inscription d\'un nouveau client pour l\'admin',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'Prénom du client'
                        },
                        {
                            value       : 'lastname',
                            description : 'Nom du client'
                        },
                        {
                            value       : 'company',
                            description : 'Nom de la société'
                        },
                        {
                            value       : 'login',
                            description : 'Login du client'
                        }

                    ]

                },
                en : {
                    name      : 'New customer registration for admin',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'Customer firstname'
                        },
                        {
                            value       : 'lastname',
                            description : 'Customer lastname'
                        },
                        {
                            value       : 'company',
                            description : 'Company name'
                        },
                        {
                            value       : 'login',
                            description : 'Customer login'
                        }

                    ]
                }
            }
        },
        {
            code        : 'orderSuccess',
            position    : 3,
            translation : {
                fr : {
                    name      : 'Commande validée (envoi du mail au client)',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'Adresse ligne 1'
                        },
                        {
                            value       : 'address.line2',
                            description : 'Adresse ligne 2'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'Nom de l\'entreprise'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'Informations complementaires'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'Code postal'
                        },
                        {
                            value       : 'address.city',
                            description : 'Ville'
                        },
                        {
                            value       : 'address.country',
                            description : 'Pays'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'Prénom'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'Nom'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'Nom de l\'entreprise'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'Date de reception'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'Livraison'
                        },
                        {
                            value       : 'delivery.price',
                            description : 'Prix de la livraison'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'Heure de livraison'
                        },
                        {
                            value       : 'order.number',
                            description : 'Numero de commande'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'Description du paiement'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'Mode de paiement'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'Prix total'
                        },
                        /* {
                            value       : 'payment.instruction',
                            description : 'Instruction de paiement (differe)'
                        }, */
                        {
                            value       : 'appUrl',
                            description : 'URL du site'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'HT ou TTC'
                        },
                        {
                            value       : 'promo.discount',
                            description : 'Valeur de la promotion'
                        },
                        {
                            value       : 'promo.code',
                            description : 'Code de la promotion'
                        },
                        {
                            value       : 'additionnalFees',
                            description : 'Frais supplémentaires'
                        },
                        {
                            value       : 'product.name',
                            description : 'Nom du produit'
                        },
                        {
                            value       : 'product.quantity',
                            description : 'Quantité du produit'
                        },
                        {
                            value       : 'product.unitPrice',
                            description : 'Prix unitaire du produit'
                        },
                        {
                            value       : 'product.totalPrice',
                            description : 'Prix total du produit'
                        }
                    ]
                },
                en : {
                    name      : 'Order validated (sending email to customer)',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'Address line 1'
                        },
                        {
                            value       : 'address.line2',
                            description : 'Address line 2'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'Company name'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'Complementary information'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'Zip code'
                        },
                        {
                            value       : 'address.city',
                            description : 'City'
                        },
                        {
                            value       : 'address.country',
                            description : 'Country'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'Firstname'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'Lastname'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'Company'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'Date receipt'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'Delivery'
                        },
                        {
                            value       : 'delivery.price',
                            description : 'Delivery price'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'Delivery time'
                        },
                        {
                            value       : 'order.number',
                            description : 'Order number'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'Description of payment'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'Payment method'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'Total price'
                        },
                        /*                         {
                            value       : 'payment.instruction',
                            description : 'Payment instruction (deferred)'
                        }, */
                        {
                            value       : 'appUrl',
                            description : 'Website URL'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'ATI or ET'
                        },
                        {
                            value       : 'promo.discount',
                            description : 'Promotion value'
                        },
                        {
                            value       : 'promo.code',
                            description : 'Promotion code'
                        },
                        {
                            value       : 'additionnalFees',
                            description : 'Additionnal fees'
                        },
                        {
                            value       : 'product.name',
                            description : 'Product name'
                        },
                        {
                            value       : 'product.quantity',
                            description : 'Product quantity'
                        },
                        {
                            value       : 'product.unitPrice',
                            description : 'Product unitary price '
                        },
                        {
                            value       : 'product.totalPrice',
                            description : 'Product total price'
                        }
                    ]
                }
            }
        },
        {
            code        : 'orderSuccessCompany',
            position    : 4,
            translation : {
                fr : {
                    name      : 'Commande validée (envoi du mail à l\'entreprise)',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'Adresse ligne 1'
                        },
                        {
                            value       : 'address.line2',
                            description : 'Adresse ligne 2'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'Nom de l\'entreprise'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'Informations complementaires'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'Code postal'
                        },
                        {
                            value       : 'address.city',
                            description : 'Ville'
                        },
                        {
                            value       : 'address.country',
                            description : 'Pays'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'Prenom'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'Nom'
                        },
                        {
                            value       : 'order.customer.mobilePhone',
                            description : 'Phone'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'Nom de l\'entreprise'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'Date de reception'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'Livraison'
                        },
                        {
                            value       : 'delivery.price',
                            description : 'Prix de la livraison'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'Heure de livraison'
                        },
                        {
                            value       : 'order.number',
                            description : 'Numero de commande'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'Description du paiement'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'Mode de paiement'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'Prix total'
                        },
                        /* {
                            value       : 'payment.instruction',
                            description : 'Instruction de paiement (differe)'
                        }, */
                        {
                            value       : 'appUrl',
                            description : 'URL du site'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'HT ou TTC'
                        },
                        {
                            value       : 'promo.discount',
                            description : 'Valeur de la promotion'
                        },
                        {
                            value       : 'promo.code',
                            description : 'Code de la promotion'
                        },
                        {
                            value       : 'product.name',
                            description : 'Nom du produit'
                        },
                        {
                            value       : 'product.quantity',
                            description : 'Quantité du produit'
                        },
                        {
                            value       : 'product.unitPrice',
                            description : 'Prix unitaire du produit'
                        },
                        {
                            value       : 'product.totalPrice',
                            description : 'Prix total du produit'
                        }
                    ]

                },
                en : {
                    name      : 'Order validated (sending the email to the company)',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'Address line 1'
                        },
                        {
                            value       : 'address.line2',
                            description : 'AAddress line 2'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'Company name'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'Complementary information'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'Zip code'
                        },
                        {
                            value       : 'address.city',
                            description : 'City'
                        },
                        {
                            value       : 'address.country',
                            description : 'Country'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'Firstname'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'Lastname'
                        },
                        {
                            value       : 'order.customer.mobilePhone',
                            description : 'Phone'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'Company'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'Date receipt'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'Delivery'
                        },
                        {
                            value       : 'delivery.price',
                            description : 'Delivery price'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'Delivery time'
                        },
                        {
                            value       : 'order.number',
                            description : 'Order number'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'Description of payment'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'Payment method'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'Total price'
                        },
                        /*                         {
                            value       : 'payment.instruction',
                            description : 'Payment instruction (deferred)'
                        }, */
                        {
                            value       : 'appUrl',
                            description : 'Website URL'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'ATI or ET'
                        },
                        {
                            value       : 'promo.discount',
                            description : 'Promotion value'
                        },
                        {
                            value       : 'promo.code',
                            description : 'Promotion code'
                        },
                        {
                            value       : 'product.name',
                            description : 'Product name'
                        },
                        {
                            value       : 'product.quantity',
                            description : 'Product quantity'
                        },
                        {
                            value       : 'product.unitPrice',
                            description : 'Product unitary price '
                        },
                        {
                            value       : 'product.totalPrice',
                            description : 'Product total price'
                        }
                    ]
                }
            }
        },
        {
            code        : 'passwordRecovery',
            position    : 5,
            translation : {
                fr : {
                    name      : 'Récupération de votre mot de passe',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'Prénom du client'
                        },
                        {
                            value       : 'lastname',
                            description : 'Nom du client'
                        },
                        {
                            value       : 'company',
                            description : 'Nom de la société'
                        },
                        {
                            value       : 'URL_SITE',
                            description : 'Url du site'
                        },
                        {
                            value       : 'token',
                            description : 'Token'
                        }
                    ]

                },
                en : {
                    name      : 'Recovering your password',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'Customer firstname'
                        },
                        {
                            value       : 'lastname',
                            description : 'Customer lastname'
                        },
                        {
                            value       : 'company',
                            description : 'Company name'
                        },
                        {
                            value       : 'URL_SITE',
                            description : 'App URL'
                        },
                        {
                            value       : 'token',
                            description : 'Token'
                        }
                    ]

                }
            }
        },
        {
            code        : 'contactMail',
            position    : 6,
            translation : {
                fr : {
                    name      : 'Mail de contact',
                    variables : [
                        {
                            value       : 'formDatas',
                            description : 'Ensemble des informations du formulaire de contact'
                        }
                    ]

                },
                en : {
                    name      : 'Contact email',
                    variables : [
                        {
                            value       : 'formDatas',
                            description : 'All the information in the contact form'
                        }
                    ]

                }
            }
        },
        {
            code        : 'changeOrderStatus',
            position    : 7,
            translation : {
                fr : {
                    name      : 'Changement de statut de la commande',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'Prénom du client'
                        },
                        {
                            value       : 'lastname',
                            description : 'Nom du client'
                        },
                        {
                            value       : 'company',
                            description : 'Nom de la société'
                        },
                        {
                            value       : 'status',
                            description : 'Status de la commande'
                        },
                        {
                            value       : 'appUrl',
                            description : 'URL du site'
                        },
                        {
                            value       : 'number',
                            description : 'Numéro de commande'
                        }
                    ]

                },
                en : {
                    name      : 'Order status change',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'Customer firstname'
                        },
                        {
                            value       : 'lastname',
                            description : 'Customer lastname'
                        },
                        {
                            value       : 'company',
                            description : 'Company name'
                        },
                        {
                            value       : 'status',
                            description : 'Order status'
                        },
                        {
                            value       : 'appUrl',
                            description : 'Website Url'
                        },
                        {
                            value       : 'number',
                            description : 'Order number'
                        }
                    ]

                }
            }
        },
        {
            code        : 'rmaOrder',
            position    : 8,
            translation : {
                fr : {
                    name      : 'Réception retour produit',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'Prénom du client'
                        },
                        {
                            value       : 'lastname',
                            description : 'Nom du client'
                        },
                        {
                            value       : 'refund',
                            description : 'Type de remboursement'
                        },
                        {
                            value       : 'articles',
                            description : 'Articles retournés'
                        },
                        {
                            value       : 'date',
                            description : 'Date de retour'
                        },
                        {
                            value       : 'number',
                            description : 'Numéro de la commande'
                        }
                    ]

                },
                en : {
                    name      : 'Product return receipt',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'Customer firstname'
                        },
                        {
                            value       : 'lastname',
                            description : 'Customer lastname'
                        },
                        {
                            value       : 'refund',
                            description : 'Refund type'
                        },
                        {
                            value       : 'articles',
                            description : 'Returned articles'
                        },
                        {
                            value       : 'date',
                            description : 'Return date'
                        },
                        {
                            value       : 'number',
                            description : 'Order number'
                        }
                    ]

                }
            }
        },
        {
            code        : 'orderSent',
            position    : 9,
            translation : {
                fr : {
                    name      : 'Commande envoyée',
                    variables : [
                        {
                            value       : 'company',
                            description : 'Nom de la société'
                        },
                        {
                            value       : 'address',
                            description : 'Adresse du client'
                        },
                        {
                            value       : 'transporterName',
                            description : 'Nom du transporteur'
                        },
                        {
                            value       : 'date',
                            description : 'Date d\'envoie '
                        },
                        {
                            value       : 'trackingUrl',
                            description : 'Lien de suivis de colis'
                        },
                        {
                            value       : 'number',
                            description : 'Numéro de la commande'
                        }
                    ]

                },
                en : {
                    name      : 'Order sent',
                    variables : [
                        {
                            value       : 'company',
                            description : 'Company name'
                        },
                        {
                            value       : 'address',
                            description : 'Customer address'
                        },
                        {
                            value       : 'transporterName',
                            description : 'Carrier'
                        },
                        {
                            value       : 'date',
                            description : 'Sending date'
                        },
                        {
                            value       : 'trackingUrl',
                            description : 'Tracking URL'
                        },
                        {
                            value       : 'number',
                            description : 'Order number'
                        }
                    ]

                }
            }
        },
        {
            code        : 'orderSuccessDeferred',
            position    : 10,
            translation : {
                fr : {
                    name      : 'Commande avec paiement différé',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'Adresse ligne 1'
                        },
                        {
                            value       : 'address.line2',
                            description : 'Adresse ligne 2'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'Nom de l\'entreprise'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'Informations complementaires'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'Code postal'
                        },
                        {
                            value       : 'address.city',
                            description : 'Ville'
                        },
                        {
                            value       : 'address.country',
                            description : 'Pays'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'Prenom'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'Nom'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'Nom de l\'entreprise'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'Date de reception'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'Livraison'
                        },
                        {
                            value       : 'delivery.price',
                            description : 'Prix de la livraison'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'Heure de livraison'
                        },
                        {
                            value       : 'order.number',
                            description : 'Numero de commande'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'Description du paiement'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'Mode de paiement'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'Prix total'
                        },
                        {
                            value       : 'payment.instruction',
                            description : 'Instruction de paiement'
                        },
                        {
                            value       : 'appUrl',
                            description : 'URL du site'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'HT ou TTC'
                        },
                        {
                            value       : 'promo.discount',
                            description : 'Valeur de la promotion'
                        },
                        {
                            value       : 'promo.code',
                            description : 'Promotion code'
                        },
                        {
                            value       : 'product.name',
                            description : 'Nom du produit'
                        },
                        {
                            value       : 'product.quantity',
                            description : 'Quantité du produit'
                        },
                        {
                            value       : 'product.unitPrice',
                            description : 'Prix unitaire du produit'
                        },
                        {
                            value       : 'product.totalPrice',
                            description : 'Prix total du produit'
                        }
                    ]
                },
                en : {
                    name      : 'Order with deferred payment',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'Address line 1'
                        },
                        {
                            value       : 'address.line2',
                            description : 'Address line 2'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'Company name'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'Complementary information'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'Zip code'
                        },
                        {
                            value       : 'address.city',
                            description : 'City'
                        },
                        {
                            value       : 'address.country',
                            description : 'Country'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'Firstname'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'Lastname'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'Company'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'Date receipt'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'Delivery'
                        },
                        {
                            value       : 'delivery.price',
                            description : 'Delivery price'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'Delivery time'
                        },
                        {
                            value       : 'order.number',
                            description : 'Order number'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'Description of payment'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'Payment method'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'Total price'
                        },
                        {
                            value       : 'payment.instruction',
                            description : 'Payment instruction'
                        },
                        {
                            value       : 'appUrl',
                            description : 'Website URL'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'ATI or ET'
                        },
                        {
                            value       : 'promo.discount',
                            description : 'Promotion value'
                        },
                        {
                            value       : 'promo.code',
                            description : 'Promotion code'
                        },
                        {
                            value       : 'product.name',
                            description : 'Product name'
                        },
                        {
                            value       : 'product.quantity',
                            description : 'Product quantity'
                        },
                        {
                            value       : 'product.unitPrice',
                            description : 'Product unitary price '
                        },
                        {
                            value       : 'product.totalPrice',
                            description : 'Product total price'
                        }
                    ]
                }
            }
        },
        {
            code        : 'activationAccount',
            position    : 11,
            translation : {
                fr : {
                    name      : 'Activation du compte',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'Prénom du client'
                        },
                        {
                            value       : 'lastname',
                            description : 'Nom du client'
                        },
                        {
                            value       : 'company',
                            description : 'Nom de la société'
                        },
                        {
                            value       : 'URL_SITE',
                            description : 'URL du site'
                        },
                        {
                            value       : 'token',
                            description : 'Token'
                        }
                    ]

                },
                en : {
                    name      : 'Account activation',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'Customer firsname'
                        },
                        {
                            value       : 'lastname',
                            description : 'Customer lastname'
                        },
                        {
                            value       : 'company',
                            description : 'Nom de la société'
                        },
                        {
                            value       : 'URL_SITE',
                            description : 'App URL'
                        },
                        {
                            value       : 'token',
                            description : 'Token'
                        }
                    ]

                }
            }
        },
        {
            code        : 'requestCancelOrderNotify',
            position    : 12,
            translation : {
                fr : {
                    name      : 'Demande d\'annulation de commande',
                    variables : [
                        {
                            value       : 'number',
                            description : 'Numéro de la commande'
                        },
                        {
                            value       : 'status',
                            description : 'Status de la commande'
                        },
                        {
                            value       : 'company',
                            description : 'Nom de la société'
                        },
                        {
                            value       : 'firstname',
                            description : 'Prénom du client'
                        },
                        {
                            value       : 'lastname',
                            description : 'Nom du client'
                        }
                    ]

                },
                en : {
                    name      : 'Order cancellation request',
                    variables : [
                        {
                            value       : 'number',
                            description : 'Order number'
                        },
                        {
                            value       : 'status',
                            description : 'Order status'
                        },
                        {
                            value       : 'company',
                            description : 'Company name'
                        },
                        {
                            value       : 'firstname',
                            description : 'Customer firstname'
                        },
                        {
                            value       : 'lastname',
                            description : 'Customer lastname'
                        }
                    ]

                }
            }
        },
        {
            code        : 'pendingCarts',
            position    : 13,
            translation : {
                fr : {
                    name      : 'Relancer par mail les paniers en attente',
                    variables : [
                        {
                            value       : 'customer.firstname',
                            description : 'Prénom du client'
                        },
                        {
                            value       : 'customer.lastname',
                            description : 'Nom du client'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'HT ou TTC'
                        },
                        {
                            value       : 'product.name',
                            description : 'Nom du produit'
                        },
                        {
                            value       : 'product.quantity',
                            description : 'Quantité du produit'
                        },
                        {
                            value       : 'product.unitPrice',
                            description : 'Prix unitaire du produit'
                        },
                        {
                            value       : 'product.totalPrice',
                            description : 'Prix total du produit'
                        }
                        // {
                        //     value       : 'startitems',
                        //     description : 'Insérer avant les informations produits'
                        // },
                        // {
                        //     value       : 'enditems',
                        //     description : 'Insérer après les informations produits'
                        // }
                    ]

                },
                en : {
                    name      : 'Send mail to pending carts',
                    variables : [
                        {
                            value       : 'customer.firstname',
                            description : 'Customer firstname'
                        },
                        {
                            value       : 'customer.lastname',
                            description : 'Customer lastname'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'ATI or ET'
                        },
                        {
                            value       : 'product.name',
                            description : 'Product name'
                        },
                        {
                            value       : 'product.quantity',
                            description : 'Product quantity'
                        },
                        {
                            value       : 'product.unitPrice',
                            description : 'Product unitary price '
                        },
                        {
                            value       : 'product.totalPrice',
                            description : 'Product total price'
                        }
                        // {
                        //     value       : 'startitems',
                        //     description : 'Insert before products informations'
                        // },
                        // {
                        //     value       : 'enditems',
                        //     description : 'Insert after products informations'
                        // }
                    ]

                }
            }
        },
        {
            code        : 'error',
            position    : 14,
            translation : {
                fr : {
                    name      : 'Envoyer une erreur par mail',
                    variables : [
                        {
                            value       : 'error',
                            description : 'L\'erreur a envoyer'
                        }
                    ]

                },
                en : {
                    name      : 'Send an error by mail',
                    variables : [
                        {
                            value       : 'error',
                            description : 'The error to send'
                        }
                    ]

                }
            }
        }
    ];
    // Populate mailType in BDD
    for (const mailType of mailTypes) {
        await MailType.findOneAndUpdate({code: mailType.code}, {$set: mailType}, {new: true, upsert: true});
    }

    /* ********** Payment methods ********** */
    const imgTrans              = '/medias/paiement-virement-logo.png';
    const imgCheck              = '/medias/paiement-cheque-logo.png ';
    const defaultPaymentMethods = [
        {
            code        : 'transfer',
            translation : {
                fr : {name: 'Virement', urlLogo: imgTrans, description: 'Virement bancaire requis dans un délais de 5 jours'},
                en : {name: 'Bank transfer', urlLogo: imgTrans, description: 'Bank transfer required within 5 days'}
            },
            active     : true,
            isDeferred : true
        },
        {
            code        : 'cheque',
            translation : {
                fr : {name: 'Chèque', urlLogo: imgCheck, description: 'Paiement par chèque à nous envoyer dans les 5 jours'},
                en : {name: 'Check', urlLogo: imgCheck, description: 'Payment by check to be sent to us within 5 days'}
            },
            active     : true,
            isDeferred : true
        },
        {
            code        : 'cash',
            translation : {
                fr : {name: 'Espèces'},
                en : {name: 'Cash'}
            },
            active     : false,
            isDeferred : true
        }
    ];
    for (const paymentMethod of defaultPaymentMethods) {
        await PaymentMethods.findOneAndUpdate({code: paymentMethod.code}, {$setOnInsert: paymentMethod}, {new: true, upsert: true});
    }

    /* ********** Admin acces rights ********** */
    const allRights = [
        {
            code      : 'orders',
            translate : {
                fr : {
                    name : 'Transactions > Commandes'
                },
                en : {
                    name : 'Transactions > Orders'
                }
            }
        },
        {
            code      : 'editHtml',
            translate : {
                fr : {
                    name : "Editer de l'HTML"
                },
                en : {
                    name : 'Edit HTML'
                }
            }
        },
        {
            code      : 'statistics',
            translate : {
                fr : {
                    name : 'Statistiques'
                },
                en : {
                    name : 'Statistics'
                }
            }
        },
        {
            code      : 'modules',
            translate : {
                fr : {
                    name : 'Modules'
                },
                en : {
                    name : 'Plugins'
                }
            }
        },
        {
            code      : 'update',
            translate : {
                fr : {
                    name : 'Paramètres > Mise à jour'
                },
                en : {
                    name : 'Settings > Update'
                }
            }
        },
        {
            code      : 'system',
            translate : {
                fr : {
                    name : 'Paramètres > Système'
                },
                en : {
                    name : 'Settings > System'
                }
            }
        },
        {
            code      : 'jobs',
            translate : {
                fr : {
                    name : 'Paramètres > Tâches planifiées'
                },
                en : {
                    name : 'Settings > Planned tasks'
                }
            }
        },
        {
            code      : 'stock',
            translate : {
                fr : {
                    name : 'Paramètres > Param Commande'
                },
                en : {
                    name : 'Settings > Orders param'
                }
            }
        },
        {
            code      : 'config',
            translate : {
                fr : {
                    name : 'Paramètres > Paramètre serveur'
                },
                en : {
                    name : 'Settings > Server settings'
                }
            }
        },
        {
            code      : 'translate',
            translate : {
                fr : {
                    name : 'Apparence > Translation'
                },
                en : {
                    name : 'Design > Translation'
                }
            }
        },
        {
            code      : 'design',
            translate : {
                fr : {
                    name : 'Apparence > CSS'
                },
                en : {
                    name : 'Design > CSS'
                }
            }
        },
        {
            code      : 'themes',
            translate : {
                fr : {
                    name : 'Apparence > Thèmes'
                },
                en : {
                    name : 'Design > Themes'
                }
            }
        },
        {
            code      : 'admin',
            translate : {
                fr : {
                    name : 'Configuration > Admin'
                },
                en : {
                    name : 'Configuration > Admin'
                }
            }
        },
        {
            code      : 'paymentMethods',
            translate : {
                fr : {
                    name : 'Configuration > Modes de paiement'
                },
                en : {
                    name : 'Configuration > Payment modes'
                }
            }
        },
        {
            code      : 'languages',
            translate : {
                fr : {
                    name : 'Configuration > Langues'
                },
                en : {
                    name : 'Configuration > Languages'
                }
            }
        },
        {
            code      : 'territories',
            translate : {
                fr : {
                    name : 'Configuration > territoires'
                },
                en : {
                    name : 'Configuration > Territories'
                }
            }
        },
        {
            code      : 'shipments',
            translate : {
                fr : {
                    name : 'Configuration > Transporteurs'
                },
                en : {
                    name : 'Configuration > Shippings'
                }
            }
        },
        {
            code      : 'mails',
            translate : {
                fr : {
                    name : 'Configuration > Mails'
                },
                en : {
                    name : 'Configuration > Mails'
                }
            }
        },
        {
            code      : 'newsletters',
            translate : {
                fr : {
                    name : 'Clients > Newsletter'
                },
                en : {
                    name : 'Customers > Newletter'
                }
            }
        },
        {
            code      : 'contacts',
            translate : {
                fr : {
                    name : 'Clients > Contacts'
                },
                en : {
                    name : 'Customers > Contacts'
                }
            }
        },
        {
            code      : 'reviews',
            translate : {
                fr : {
                    name : 'Clients > Avis'
                },
                en : {
                    name : 'Customers > Reviews'
                }
            }
        },
        {
            code      : 'clients',
            translate : {
                fr : {
                    name : 'Clients > Clients'
                },
                en : {
                    name : 'Customers > Customers'
                }
            }
        },
        {
            code      : 'articles',
            translate : {
                fr : {
                    name : 'Site > Blog'
                },
                en : {
                    name : 'Site > Blog'
                }
            }
        },
        {
            code      : 'medias',
            translate : {
                fr : {
                    name : 'Site > Médias'
                },
                en : {
                    name : 'Site > Media'
                }
            }
        },
        {
            code      : 'slider',
            translate : {
                fr : {
                    name : 'Site > Carrousel'
                },
                en : {
                    name : 'Site > Carousel'
                }
            }
        },
        {
            code      : 'gallery',
            translate : {
                fr : {
                    name : 'Site > Gallerie'
                },
                en : {
                    name : 'Site > Gallery'
                }
            }
        },
        {
            code      : 'cmsBlocks',
            translate : {
                fr : {
                    name : 'Site > Blocs CMS'
                },
                en : {
                    name : 'Site > CMS Blocks'
                }
            }
        },
        {
            code      : 'staticPage',
            translate : {
                fr : {
                    name : 'Site > Pages'
                },
                en : {
                    name : 'Site > Pages'
                }
            }
        },
        {
            code      : 'families',
            translate : {
                fr : {
                    name : 'Catalogue > Famille'
                },
                en : {
                    name : 'Catalog > Families'
                }
            }
        },
        {
            code      : 'suppliers',
            translate : {
                fr : {
                    name : 'Catalogue > Fournisseurs'
                },
                en : {
                    name : 'Catalog > Suppliers'
                }
            }
        },
        {
            code      : 'trademarks',
            translate : {
                fr : {
                    name : 'Catalogue > Marques'
                },
                en : {
                    name : 'Catalog > Brands'
                }
            }
        },
        {
            code      : 'attributes',
            translate : {
                fr : {
                    name : 'Catalogue/Clients > Attributs'
                },
                en : {
                    name : 'Catalog/Customers > Attributes'
                }
            }
        },
        {
            code      : 'picto',
            translate : {
                fr : {
                    name : 'Catalogue > Pictogramme'
                },
                en : {
                    name : 'Catalog > Pictrogram'
                }
            }
        },
        {
            code      : 'promos',
            translate : {
                fr : {
                    name : 'Catalogue > Promotions'
                },
                en : {
                    name : 'Catalog > Discount'
                }
            }
        },
        {
            code      : 'categories',
            translate : {
                fr : {
                    name : 'Catalogue > Catégories'
                },
                en : {
                    name : 'Catalog > Categories'
                }
            }
        },
        {
            code      : 'products',
            translate : {
                fr : {
                    name : 'Catalogue > Produits'
                },
                en : {
                    name : 'Catalog > Products'
                }
            }
        },
        {
            code      : 'cart',
            translate : {
                fr : {
                    name : 'Transactions > panier'
                },
                en : {
                    name : 'Transactions > Carts'
                }
            }
        },
        {
            code      : 'invoices',
            translate : {
                fr : {
                    name : 'Transactions > Facture'
                },
                en : {
                    name : 'Transactions > Online bills'
                }
            }
        },
        {
            code      : 'payments',
            translate : {
                fr : {
                    name : 'Transactions > Paiements'
                },
                en : {
                    name : 'Transactions > Payments'
                }
            }
        }];
    for (const right of allRights) {
        await AdminRights.findOneAndUpdate({code: right.code}, {$set: right}, {new: true, upsert: true});
    }

    console.log('Database init : Done\x1b[32m \u2713 \x1b[0m');
};

const getMongdbVersion = async () => {
    try {
        const mongoVersion = await mongoose.connection.db.admin().buildInfo();
        console.log(`%s@@ MongoDB version : ${mongoVersion.version}%s`, '\x1b[32m', '\x1b[0m');
    } catch (e) {
        console.error('MongoDB version : Unknow');
    }
};

const applyMigrationIfNeeded = async () => {
    try {
        const {migrationScripts} = require('./migration');
        const config             = await mongoose.connection
            .collection('configurations')
            .findOne();
        if (config && config.environment) {
            let migration = config.environment.migration || 0;
            for (migration; migration < migrationScripts.length; migration++) {
                await migrationScripts[migration]();
                await mongoose.connection
                    .collection('configurations')
                    .updateOne({}, {$set: {'environment.migration': migration + 1}});
            }
        }
    } catch (e) {
        console.error('The migration script failed !', e);
    }
};

/**
 * Allows you to populate specific fields of each item
 * @param {any[]} items
 */
const populateItems = async (items) => {
    for (const item of items) {
        if (item.populateItem) await item.populateItem();
    }
};

/**
 * called during pre hooks for `findOneAndUpdate` and/or `updateOne`
 * @param {mongoose.Query|mongoose.Model} that query to check
 * @param {mongoose.HookNextFunction} next hooks function
 * @param {mongoose.Schema} schema schema needed to be check for translation validation
 * @return {mongoose.HookNextFunction} HookNextFunction
 */
const preUpdates = async (that, next, schema) => {
    try {
        let data = that;
        if (that instanceof mongoose.Query) {
            data = that.getUpdate();
        }
        if (data) {
            const elem = (typeof data.$set !== 'function' && data.$set) || data;
            const {
                checkCode,
                checkSlugExist,
                translationValidation
            } = schema.statics;
            let errors = [];
            if (typeof translationValidation === 'function' && elem._id) {
                errors = await translationValidation(elem, that);
            }
            if (typeof checkCode === 'function') {
                await checkCode(elem);
            }
            if (typeof checkSlugExist === 'function') {
                await checkSlugExist(elem);
            }
            return next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
        }
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    connect,
    // checkIfReplicaSet,
    initDBValues,
    getMongdbVersion,
    applyMigrationIfNeeded,
    populateItems,
    preUpdates,
    testdb,
    checkSlugExist,
    checkCode
};