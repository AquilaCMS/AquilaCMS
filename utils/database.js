/* eslint-disable max-len */
/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
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
    if (!global.aquila.envFile || !global.aquila.envFile.db) {
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
            mongoose.connect(global.aquila.envFile.db, mongooseOptions, (error) => {
                if (typeof error === 'undefined' || error === null) {
                    connection = true;
                    resolve(true);
                } else {
                    reject(new Error(`Unable to connect to" ${global.aquila.envFile.db}, ${error.toString()}`));
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
        query._id = {$ne: doc._id};
    }
    if (await mongoose.model(modelName).exists(query)) {
        throw NSErrors.SlugAlreadyExist;
    }
};

/**
 * Check if slug is not too short for this collection and language
 * @param {*} doc
 * @param {mongoose.Schema<any>} model schema needed to be check for translation validation
 */
const checkSlugLength = async (doc) => {
    if (!doc || !doc.translation) return;
    for (const [lang] of Object.entries(doc.translation)) {
        if (doc.translation[lang] && doc.translation[lang].slug && doc.translation[lang].slug.length <= 2) {
            throw NSErrors.SlugTooShort;
        }
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
        Mail,
        Languages,
        PaymentMethods,
        Shipments,
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
    global.aquila.defaultLang = defaultLang.code;

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
            translation : {[global.aquila.defaultLang]: {name: 'home', slug: 'home'}}
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
        await MailType.findOneAndUpdate({code: mailType.code}, {$setOnInsert: mailType}, {new: true, upsert: true});
    }

    /* ********** Mails template ********** */
    const mailsTemplate = [
        {
            type        : 'register',
            translation : {
                fr : {
                    subject : 'Inscription nouveau client',
                    content : "<br />\n<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande;\">\n<tbody>\n<tr class=\"header\">\n<td style=\"width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;\"><br /><span style=\"text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;\">CONFIRMATION D'INSCRIPTION</span></td>\n</tr>\n<tr>\n<td>\n<table style=\"width: 100%; background-color: #eee;\">\n<tbody>\n<tr>\n<td style=\"width: 5%;\"></td>\n<td class=\"wrapper\"><br />\n<table style=\"width: 100%; background-color: #fff; border: 1px solid #ddd;\">\n<tbody>\n<tr class=\"content\">\n<td style=\"padding: 20px; line-height: 24px; color: #888;\">Bonjour {{firstname}} {{lastname}}, <br /><br />Vous venez de vous inscrire sur le site avec l'identifiant {{login}}.<br />Veuillez valider votre email en vous rendant sur le lien suivant : <a href=\"{{URL_SITE}}checkemailvalid?token={{token}}\">{{URL_SITE}}checkemailvalid?token={{token}}</a>.</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style=\"width: 5%;\"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style=\"padding: 5px; text-align: center; width: 100%; font-size: 13px;\">© MonEntreprise - <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>"
                },
                en : {
                    content : '<br />\n<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande;">\n<tbody>\n<tr class="header">\n<td style="width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;"><br /><span style="text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;">REGISTRATION CONFIRMATION</span></td>\n</tr>\n<tr>\n<td>\n<table style="width: 100%; background-color: #eee;">\n<tbody>\n<tr>\n<td style="width: 5%;"></td>\n<td class="wrapper"><br />\n<table style="width: 100%; background-color: #fff; border: 1px solid #ddd;">\n<tbody>\n<tr class="content">\n<td style="padding: 20px; line-height: 24px; color: #888;">Hello {{firstname}} {{lastname}}, <br /><br />You have just registered on the site with the login name {{login}}. Please confirm your email by going to the following link : <a href="{{URL_SITE}}checkemailvalid?token={{token}}">{{URL_SITE}}checkemailvalid?token={{token}}</a>.</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style="width: 5%;"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style="padding: 5px; text-align: center; width: 100%; font-size: 13px;">© MyEnterprise - <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>',
                    subject : 'New customer registration'
                }
            },
            code : 'register',
            from : 'nexistepas@aquila-cms.com'
        },
        {
            type        : 'orderSuccess',
            code        : 'orderSuccess',
            from        : 'nexistepas@aquila-cms.com',
            translation : {
                fr : {
                    content : "<style>\n    #tabOrder tr {\n        text-align: center;\n    }\n</style>\n<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande;\">\n<tbody>\n<tr class=\"header\">\n<td style=\"width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;\"><br /><span style=\"text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;\">COMMANDE</span></td>\n</tr>\n<tr>\n<td>\n<table style=\"width: 100%; background-color: #eee;\">\n<tbody>\n<tr>\n<td style=\"width: 5%;\"></td>\n<td class=\"wrapper\"><br />\n<table style=\"width: 100%; background-color: #fff; border: 1px solid #ddd;\">\n<tbody>\n<tr class=\"content\">\n<td style=\"padding: 20px; line-height: 24px; color: #888;\">Bonjour {{order.customer.firstname}} {{order.customer.lastname}}, <br />Votre commande '{{order.number}}' a bien été traitée.<br /><br />\n<div id=\"tabOrder\">\n<table style=\"width: 100%;\">\n<tbody>\n<tr>\n<th>Article</th>\n<th>Quantité</th>\n<th>Prix unitaire {{taxdisplay}}</th>\n<th>Prix total {{taxdisplay}}</th>\n</tr>\n<!--startitems-->\n<tr>\n<th>{{product.name}}</th>\n<th>{{product.quantity}}</th>\n<th>{{product.unitPrice}}</th>\n<th>{{product.totalPrice}}</th>\n</tr>\n<!--enditems--><!--startshowpromo--><tr><th>Remise</th><th></th><th></th><th>{{promo.discount}}</th></tr><!--endshowpromo--></tbody>\n</table>\n<br />Prix total : {{order.priceTotal}} {{taxdisplay}}\n<br />Prix transport : {{delivery.price}} {{taxdisplay}}</div>\n</td>\n</tr>\n<tr>\n<td style=\"padding: 5px; text-align: center; width: 100%; font-size: 13px;\">© MonEnterprise - <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n</tbody>\n</table>",
                    subject : 'Votre commande'
                },
                en : {
                    content : "<style>\n    #tabOrder tr {\n        text-align: center;\n    }\n</style>\n<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande;\">\n<tbody>\n<tr class=\"header\">\n<td style=\"width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;\"><br /><span style=\"text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;\">ORDER</span></td>\n</tr>\n<tr>\n<td>\n<table style=\"width: 100%; background-color: #eee;\">\n<tbody>\n<tr>\n<td style=\"width: 5%;\"></td>\n<td class=\"wrapper\"><br />\n<table style=\"width: 100%; background-color: #fff; border: 1px solid #ddd;\">\n<tbody>\n<tr class=\"content\">\n<td style=\"padding: 20px; line-height: 24px; color: #888;\">Hello {{order.customer.firstname}} {{order.customer.lastname}}, <br /><br />Your '{{order.number}}' order has been successfully processed.<br /><br />\n<div id=\"tabOrder\">\n<table style=\"width: 100%;\">\n<tbody>\n<tr>\n<th>Article</th>\n<th>Quantity</th>\n<th>Unit price {{taxdisplay}}</th>\n<th>Total price {{taxdisplay}}</th>\n</tr>\n<!--startitems-->\n<tr>\n<th>{{product.name}}</th>\n<th>{{product.quantity}}</th>\n<th>{{product.unitPrice}}</th>\n<th>{{product.totalPrice}}</th>\n</tr>\n<!--enditems--><!--startshowpromo--><tr><th>Discount</th><th></th><th></th><th>{{promo.discount}}</th></tr><!--endshowpromo--></tbody>\n</table>\n<br />Total price : {{order.priceTotal}} {{taxdisplay}}\n<br />Delivery price : {{delivery.price}} {{taxdisplay}}</div>\n</td>\n</tr>\n<tr>\n<td style=\"padding: 5px; text-align: center; width: 100%; font-size: 13px;\">© MyEnterprise - <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n</tbody>\n</table>",
                    subject : 'Your order'
                }
            }
        },
        {
            type        : 'orderSuccessCompany',
            code        : 'newOrderForCompany',
            from        : 'nexistepas@aquila-cms.com',
            translation : {
                fr : {
                    content : "<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande;\">\n<tbody>\n<tr class=\"header\">\n<td style=\"width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;\"><br /><span style=\"text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;\">COMMANDE</span></td>\n</tr>\n<tr>\n<td>\n<table style=\"width: 100%; background-color: #eee;\">\n<tbody>\n<tr>\n<td style=\"width: 5%;\"></td>\n<td class=\"wrapper\"><br />\n<table style=\"width: 100%; background-color: #fff; border: 1px solid #ddd;\">\n<tbody>\n<tr class=\"content\">\n<td style=\"padding: 20px; line-height: 24px; color: #888;\">Bonjour, <br /><br />Vous avez une nouvelle commande n° {{order.number}} d'un total de {{order.priceTotal}}, dont des frais de livraison de {{delivery.price}}, le tout avec une remise de {{promo.discount}}.</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style=\"width: 5%;\"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style=\"padding: 5px; text-align: center; width: 100%; font-size: 13px;\">© MonEntreprise - <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>",
                    subject : 'Nouvelle commande client'
                },
                en : {
                    content : '<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande;">\n<tbody>\n<tr class="header">\n<td style="width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;"><br /><span style="text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;">ORDER</span></td>\n</tr>\n<tr>\n<td>\n<table style="width: 100%; background-color: #eee;">\n<tbody>\n<tr>\n<td style="width: 5%;"></td>\n<td class="wrapper"><br />\n<table style="width: 100%; background-color: #fff; border: 1px solid #ddd;">\n<tbody>\n<tr class="content">\n<td style="padding: 20px; line-height: 24px; color: #888;">Hello, <br /><br />You have a new order #{{order.number}} of a total of {{order.priceTotal}}, including a {{delivery.price}} shipping fee, with a discount of {{promo.discount}}.</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style="width: 5%;"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style="padding: 5px; text-align: center; width: 100%; font-size: 13px;">© MyEnterprise - <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>',
                    subject : 'New order'
                }
            }
        },
        {
            type        : 'passwordRecovery',
            code        : 'passwordRecovery',
            from        : 'nexistepas@aquila-cms.com',
            translation : {
                fr : {
                    content : "<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande;\">\n<tbody>\n<tr class=\"header\">\n<td style=\"width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;\"><br /><span style=\"text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;\">RECUPERATION DU MOT DE PASSE</span></td>\n</tr>\n<tr>\n<td>\n<table style=\"width: 100%; background-color: #eee;\">\n<tbody>\n<tr>\n<td style=\"width: 5%;\"></td>\n<td class=\"wrapper\"><br />\n<table style=\"width: 100%; background-color: #fff; border: 1px solid #ddd;\">\n<tbody>\n<tr class=\"content\">\n<td style=\"padding: 20px; line-height: 24px; color: #888;\">Bonjour {{firstname}} {{lastname}}, <br /><br />Vous avez demandé la réinitialisation de votre mot de passe. <br />Nous vous invitons à suivre le lien ci-dessous qui vous permettra de définir un nouveau mot de passe. <br /><a href=\"{{URL_SITE}}resetpass?token={{token}}\">{{URL_SITE}}resetpass?token={{token}}</a> <br /><br />Si vous n'êtes pas à l'origine de cette demande, ne tenez pas compte de cet email.</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style=\"width: 5%;\"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style=\"padding: 5px; text-align: center; width: 100%; font-size: 13px;\">© MonEntreprise - <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>",
                    subject : 'Récupération de votre mot de passe'
                },
                en : {
                    content : '<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande;">\n<tbody>\n<tr class="header">\n<td style="width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;"><br /><span style="text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;">PASSWORD RECOVERY</span></td>\n</tr>\n<tr>\n<td>\n<table style="width: 100%; background-color: #eee;">\n<tbody>\n<tr>\n<td style="width: 5%;"></td>\n<td class="wrapper"><br />\n<table style="width: 100%; background-color: #fff; border: 1px solid #ddd;">\n<tbody>\n<tr class="content">\n<td style="padding: 20px; line-height: 24px; color: #888;">Hello {{firstname}} {{lastname}}, <br /><br />You have requested the reset of your password. <br />We invite you to follow the link below which will allow you to define a new password. <br /><a href="{{URL_SITE}}resetpass?token={{token}}">{{URL_SITE}}en/resetpass?token={{token}}</a> <br /><br />If you are not the origin of this request, do not take into account this email.</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style="width: 5%;"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style="padding: 5px; text-align: center; width: 100%; font-size: 13px;">© MyEnterprise - <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>',
                    subject : 'Recover your password'
                }
            }
        },
        {
            type        : 'contactMail',
            code        : 'contactMail',
            from        : 'nexistepas@aquila-cms.com',
            translation : {
                en : {
                    content : '\n\n    <table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande">\n        <tbody><tr class="header">\n            <td style="width: 100%;text-align: center;background-color:#FFF;border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA">\n                <br>\n                <span style="text-transform: uppercase;color:#1432AA;line-height:60px;font-size:23px;font-weight:bold">INFORMATION REQUEST</span>\n            </td>\n        </tr>\n        <tr>\n            <td>\n                <table style="width: 100%;background-color:#EEE">\n                    <tbody><tr>\n                        <td style="width: 5%;"></td>\n                        <td class="wrapper">\n                            <br>\n                            <table style="width: 100%; border-style: solid; border-width: 1px; border-color: #ddd; background-color: #fff;">\n                                <tbody><tr class="content">\n                                    <td style="padding: 20px;line-height:24px;color:#888">Hello, you have received a request for information via your website.\n                                        <br><br>\n \t\t\t\t\t{{formDatas}}\n                                    </td>\n                                </tr>\n                            </tbody></table>\n                        </td>\n                        <td style="width: 5%;"></td>\n                    </tr>\n                </tbody></table>\n            </td>\n        </tr>\n        <tr>\n            <td style="padding: 5px;text-align: center; width: 100%;font-size:13px">\n                © MyEnterprise&nbsp;- <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a>\n            </td>\n        </tr>\n    </tbody></table>\n\n',
                    subject : 'Contact'
                },
                fr : {
                    content : "<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande\">\n        <tbody><tr class=\"header\">\n            <td style=\"width: 100%;text-align: center;background-color:#FFF;border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA\">\n                <br>\n                <span style=\"text-transform: uppercase;color:#1432AA;line-height:60px;font-size:23px;font-weight:bold\">DEMANDE D'INFORMATION</span>\n            </td>\n        </tr>\n        <tr>\n            <td>\n                <table style=\"width: 100%;background-color:#EEE\">\n                    <tbody><tr>\n                        <td style=\"width: 5%;\"></td>\n                        <td class=\"wrapper\">\n                            <br>\n                            <table style=\"width: 100%; border-style: solid; border-width: 1px; border-color: #ddd; background-color: #fff;\">\n                                <tbody><tr class=\"content\">\n                                    <td style=\"padding: 20px;line-height:24px;color:#888\">Bonjour, vous avez recu une demande d'information via votre site internet.\n                                        <br><br>\n \t\t\t\t\t{{formDatas}}\n                                    </td>\n                                </tr>\n                            </tbody></table>\n                        </td>\n                        <td style=\"width: 5%;\"></td>\n                    </tr>\n                </tbody></table>\n            </td>\n        </tr>\n        <tr>\n            <td style=\"padding: 5px;text-align: center; width: 100%;font-size:13px\">\n                © MonEntreprise&nbsp;- <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a>\n            </td>\n        </tr>\n    </tbody></table>",
                    subject : 'Contact'
                }
            }
        },
        {
            type        : 'changeOrderStatus',
            translation : {
                fr : {
                    content : '<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande">\n        <tbody><tr class="header">\n            <td style="width: 100%;text-align: center;background-color:#FFF;border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA">\n                <br>\n                <span style="text-transform: uppercase;color:#1432AA;line-height:60px;font-size:23px;font-weight:bold">CHANGEMENT DE STATUS</span></td>\n        </tr>\n        <tr>\n            <td>\n                <table style="width: 100%;background-color:#EEE">\n                    <tbody><tr>\n                        <td style="width: 5%;"></td>\n                        <td class="wrapper">\n                            <br>\n                            <table style="width: 100%; border-style: solid; border-width: 1px; border-color: #ddd; background-color: #fff;">\n                                <tbody><tr class="content">\n                                    <td style="padding: 20px;line-height:24px;color:#888">Bonjour,<br><br>Votre commande {{number}} vient de changer de statut.<br>Son état est désormais {{status}}.<br></td>\n                                </tr>\n                            </tbody></table>\n                        </td>\n                        <td style="width: 5%;"></td>\n                    </tr>\n                </tbody></table>\n            </td>\n        </tr>\n        <tr>\n            <td style="padding: 5px;text-align: center; width: 100%;font-size:13px">\n                © MonEntreprise&nbsp;- <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a>\n            </td>\n        </tr>\n    </tbody></table>',
                    subject : 'Changement de status de votre commande'
                },
                en : {
                    subject : 'Change of status of your order',
                    content : '<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande">\n        <tbody><tr class="header">\n            <td style="width: 100%;text-align: center;background-color:#FFF;border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA">\n                <br>\n                <span style="text-transform: uppercase;color:#1432AA;line-height:60px;font-size:23px;font-weight:bold">CHANGE OF STATUS</span></td>\n        </tr>\n        <tr>\n            <td>\n                <table style="width: 100%;background-color:#EEE">\n                    <tbody><tr>\n                        <td style="width: 5%;"></td>\n                        <td class="wrapper">\n                            <br>\n                            <table style="width: 100%; border-style: solid; border-width: 1px; border-color: #ddd; background-color: #fff;">\n                                <tbody><tr class="content">\n                                    <td style="padding: 20px;line-height:24px;color:#888">Hello, <br><br>Your order {{number}} has just changed status. <br> Its status is now {{status}}.<br></td>\n                                </tr>\n                            </tbody></table>\n                        </td>\n                        <td style="width: 5%;"></td>\n                    </tr>\n                </tbody></table>\n            </td>\n        </tr>\n        <tr>\n            <td style="padding: 5px;text-align: center; width: 100%;font-size:13px">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;©&nbsp;MyEnterprise&nbsp;- <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a><br></td>\n        </tr>\n    </tbody></table>'
                }
            },
            code : 'changeOrderStatus',
            from : 'nexistepas@aquila-cms.com'
        },
        {
            type        : 'orderSuccessDeferred',
            code        : 'orderSuccessDeferred',
            from        : 'nexistepas@aquila-cms.com',
            translation : {
                en : {
                    subject : 'Order with deferred payment',
                    content : "<style>\n    #tabOrder tr {\n        text-align: center;\n    }\n</style>\n<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande;\">\n<tbody>\n<tr class=\"header\">\n<td style=\"width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;\"><br /><span style=\"text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;\">ORDER</span></td>\n</tr>\n<tr>\n<td>\n<table style=\"width: 100%; background-color: #eee;\">\n<tbody>\n<tr>\n<td style=\"width: 5%;\"></td>\n<td class=\"wrapper\"><br />\n<table style=\"width: 100%; background-color: #fff; border: 1px solid #ddd;\">\n<tbody>\n<tr class=\"content\">\n<td style=\"padding: 20px; line-height: 24px; color: #888;\">Hello {{order.customer.firstname}} {{order.customer.lastname}}, <br /><br />Your order '{{order.number}}' has been saved. <br />For it to be validated and taken into account, you must send us your payment by the method you have selected : {{order.paymentMode}}.<br /><br />\n<div id=\"tabOrder\">\n<table style=\"width: 100%;\">\n<tbody>\n<tr>\n<th>Article</th>\n<th>Quantity</th>\n<th>Unit price {{taxdisplay}}</th>\n<th>Total price {{taxdisplay}}</th>\n</tr>\n<!--startitems-->\n<tr>\n<th>{{product.name}}</th>\n<th>{{product.quantity}}</th>\n<th>{{product.unitPrice}}</th>\n<th>{{product.totalPrice}}</th>\n</tr>\n<!--enditems--><!--startshowpromo--><tr><th>Discount</th><th></th><th></th><th>{{promo.discount}}</th></tr><!--endshowpromo--></tbody>\n</table>\n</div>\n<br />Delivery price : {{delivery.price}} {{taxdisplay}}<br />Total price : {{order.priceTotal}} {{taxdisplay}}</td>\n</tr>\n<tr>\n<td style=\"padding: 5px; text-align: center; width: 100%; font-size: 13px;\">© MyEnterprise - <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n</tbody>\n</table>"
                },
                fr : {
                    content : "<style>\n    #tabOrder tr {\n        text-align: center;\n    }\n</style>\n<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande;\">\n<tbody>\n<tr class=\"header\">\n<td style=\"width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;\"><br /><span style=\"text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;\">COMMANDE</span></td>\n</tr>\n<tr>\n<td>\n<table style=\"width: 100%; background-color: #eee;\">\n<tbody>\n<tr>\n<td style=\"width: 5%;\"></td>\n<td class=\"wrapper\"><br />\n<table style=\"width: 100%; background-color: #fff; border: 1px solid #ddd;\">\n<tbody>\n<tr class=\"content\">\n<td style=\"padding: 20px; line-height: 24px; color: #888;\">Bonjour {{order.customer.firstname}} {{order.customer.lastname}}, <br /><br />Votre commande '{{order.number}}' a bien été enregistrée.<br />Pour qu'elle soit validée et prise en compte, vous devez nous envoyer votre paiement par la méthode que vous avez sélectionné : {{order.paymentMode}}.<br /><br />\n<div id=\"tabOrder\">\n<table style=\"width: 100%;\">\n<tbody>\n<tr>\n<th>Article</th>\n<th>Quantité</th>\n<th>Prix unitaire {{taxdisplay}}</th>\n<th>Prix total {{taxdisplay}}</th>\n</tr>\n<!--startitems-->\n<tr>\n<th>{{product.name}}</th>\n<th>{{product.quantity}}</th>\n<th>{{product.unitPrice}}</th>\n<th>{{product.totalPrice}}</th>\n</tr>\n<!--enditems--><!--startshowpromo--><tr><th>Remise</th><th></th><th></th><th>{{promo.discount}}</th></tr><!--endshowpromo--></tbody>\n</table>\n</div>\n<br />Prix transport : {{delivery.price}} {{taxdisplay}}<br />Prix total : {{order.priceTotal}} {{taxdisplay}}</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style=\"width: 5%;\"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style=\"padding: 5px; text-align: center; width: 100%; font-size: 13px;\">© MonEnterprise - <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>",
                    subject : 'Commande avec paiement différé'
                }
            }
        },
        {
            type        : 'activationAccount',
            translation : {
                en : {
                    content : '<br />\n<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande;">\n<tbody>\n<tr class="header">\n<td style="width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;"><br /><span style="text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;">CONFIRMATION OF YOUR ACCOUNT</span></td>\n</tr>\n<tr>\n<td>\n<table style="width: 100%; background-color: #eee;">\n<tbody>\n<tr>\n<td style="width: 5%;"></td>\n<td class="wrapper"><br />\n<table style="width: 100%; background-color: #fff; border: 1px solid #ddd;">\n<tbody>\n<tr class="content">\n<td style="padding: 20px; line-height: 24px; color: #888;">Hello {{firstname}} {{lastname}}, <br /><br />Please validate your email by going to the following link : <a href="{{URL_SITE}}checkemailvalid?token={{token}}">{{URL_SITE}}checkemailvalid?token={{token}}</a>.</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style="width: 5%;"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style="padding: 5px; text-align: center; width: 100%; font-size: 13px;">© MyEnterprise - <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>',
                    subject : 'Account Validation'
                },
                fr : {
                    content : '<br />\n<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande;">\n<tbody>\n<tr class="header">\n<td style="width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;"><br /><span style="text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;">CONFIRMATION DE VOTRE COMPTE</span></td>\n</tr>\n<tr>\n<td>\n<table style="width: 100%; background-color: #eee;">\n<tbody>\n<tr>\n<td style="width: 5%;"></td>\n<td class="wrapper"><br />\n<table style="width: 100%; background-color: #fff; border: 1px solid #ddd;">\n<tbody>\n<tr class="content">\n<td style="padding: 20px; line-height: 24px; color: #888;">Bonjour {{firstname}} {{lastname}}, <br /><br />Veuillez valider votre email en vous rendant sur le lien suivant : <a href="{{URL_SITE}}checkemailvalid?token={{token}}">{{URL_SITE}}checkemailvalid?token={{token}}</a>.</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style="width: 5%;"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style="padding: 5px; text-align: center; width: 100%; font-size: 13px;">© MonEnterprise - <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>',
                    subject : 'Validation de compte'
                }
            },
            code : 'activationAccount',
            from : 'nexistepas@aquila-cms.com'
        },
        {
            type        : 'orderSent',
            code        : 'orderSent',
            from        : 'nexistepas@aquila-cms.com',
            translation : {
                en : {
                    subject : 'Sending your order',
                    content : '<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande;">\n<tbody>\n<tr class="header">\n<td style="width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;"><br /><span style="text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;">Sending your order</span></td>\n</tr>\n<tr>\n<td>\n<table style="width: 100%; background-color: #eee;">\n<tbody>\n<tr>\n<td style="width: 5%;"></td>\n<td class="wrapper"><br />\n<table style="width: 100%; background-color: #fff; border: 1px solid #ddd;">\n<tbody>\n<tr class="content">\n<td style="padding: 20px; line-height: 24px; color: #888;">Hello,<br /><br />We inform you that your order has been shipped by the carrier {{transporterName}}. <br />Your parcel is being transported and this order can not be modified any more. <br /><br />Expected delivery date on {{date}} at the following address: <br />{{address}}. Track your package on the <a href="{{trackingUrl}}"> carrier platform </a>. <br />Regards,</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style="width: 5%;"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style="padding: 5px; text-align: center; width: 100%; font-size: 13px;">© MyEnterprise - <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>'
                },
                fr : {
                    content : "<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande;\">\n<tbody>\n<tr class=\"header\">\n<td style=\"width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;\"><br /><span style=\"text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;\">Envoi de votre commande</span></td>\n</tr>\n<tr>\n<td>\n<table style=\"width: 100%; background-color: #eee;\">\n<tbody>\n<tr>\n<td style=\"width: 5%;\"></td>\n<td class=\"wrapper\"><br />\n<table style=\"width: 100%; background-color: #fff; border: 1px solid #ddd;\">\n<tbody>\n<tr class=\"content\">\n<td style=\"padding: 20px; line-height: 24px; color: #888;\">Bonjour,<br /><br />Nous vous informons que votre commande a été epédiée par le transporteur {{transporterName}}.<br />Votre colis est en cours d'acheminement et cette commande ne peut donc plus être modifiée.<br /><br />Date de livraison estimé le {{date}} à l'adresse suivante :<br />{{address}}.<br />Suivre votre colis sur la <a href=\"{{trackingUrl}}\">plateforme du transporteur</a>.<br /><br />Cordialement,</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style=\"width: 5%;\"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style=\"padding: 5px; text-align: center; width: 100%; font-size: 13px;\">© MonEnterprise - <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>",
                    subject : 'Envoi de votre commande'
                }
            }
        },
        {
            type        : 'rmaOrder',
            code        : 'RMA',
            from        : 'nexistepas@aquila-cms.com',
            translation : {
                fr : {
                    subject : 'Retour produit',
                    content : "<style>\n    #tabOrder tr {\n        text-align: center;\n    }\n</style>\n<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande;\">\n<tbody>\n<tr class=\"header\">\n<td style=\"width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;\"><br /><span style=\"text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;\">Retour produit</span></td>\n</tr>\n<tr>\n<td>\n<table style=\"width: 100%; background-color: #eee;\">\n<tbody>\n<tr>\n<td style=\"width: 5%;\"></td>\n<td class=\"wrapper\"><br />\n<table style=\"width: 100%; background-color: #fff; border: 1px solid #ddd;\">\n<tbody>\n<tr class=\"content\">\n<td style=\"padding: 20px; line-height: 24px; color: #888;\">Bonjour {{firstname}} {{lastname}}, <br /><br />Votre commande '{{number}}' a bien fait l'objet d'un retour ou d'un remboursement de {{refund}}€.<br />{{articles}}</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style=\"width: 5%;\"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style=\"padding: 5px; text-align: center; width: 100%; font-size: 13px;\">© MonEntreprise - <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>"
                },
                en : {
                    subject : 'Product return',
                    content : "<style>\n    #tabOrder tr {\n        text-align: center;\n    }\n</style>\n<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande;\">\n<tbody>\n<tr class=\"header\">\n<td style=\"width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;\"><br /><span style=\"text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;\">Product return</span></td>\n</tr>\n<tr>\n<td>\n<table style=\"width: 100%; background-color: #eee;\">\n<tbody>\n<tr>\n<td style=\"width: 5%;\"></td>\n<td class=\"wrapper\"><br />\n<table style=\"width: 100%; background-color: #fff; border: 1px solid #ddd;\">\n<tbody>\n<tr class=\"content\">\n<td style=\"padding: 20px; line-height: 24px; color: #888;\">Hello {{firstname}} {{lastname}}, <br /><br />Your order '{{number}}' has been returned or refunded of {{refund}} €.<br />{{articles}}</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style=\"width: 5%;\"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style=\"padding: 5px; text-align: center; width: 100%; font-size: 13px;\">© MyEnterprise - <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>"
                }
            }
        },
        {
            type        : 'requestCancelOrderNotify',
            code        : 'requestcancelorder',
            from        : 'nexistepas@aquila-cms.com',
            translation : {
                en : {
                    subject : 'Request Cancel',
                    content : '<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande;">\n<tbody>\n<tr class="header">\n<td style="width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;"><br /><span style="text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;">CHANGE OF STATUS</span></td>\n</tr>\n<tr>\n<td>\n<table style="width: 100%; background-color: #eee;">\n<tbody>\n<tr>\n<td style="width: 5%;"></td>\n<td class="wrapper"><br />\n<table style="width: 100%; background-color: #fff; border: 1px solid #ddd;">\n<tbody>\n<tr class="content">\n<td style="padding: 20px; line-height: 24px; color: #888;">Hello, <br /><br />A request to cancel the {{number}} order has been made..</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style="width: 5%;"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style="padding: 5px; text-align: center; width: 100%; font-size: 13px;">                 © MyEnterprise - <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>'
                },
                fr : {
                    content : "<table class=\"email\" style=\"width: 100%; margin: 0; font-family: LucidaGrande;\">\n<tbody>\n<tr class=\"header\">\n<td style=\"width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;\"><br /><span style=\"text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;\">CHANGE OF STATUS</span></td>\n</tr>\n<tr>\n<td>\n<table style=\"width: 100%; background-color: #eee;\">\n<tbody>\n<tr>\n<td style=\"width: 5%;\"></td>\n<td class=\"wrapper\"><br />\n<table style=\"width: 100%; background-color: #fff; border: 1px solid #ddd;\">\n<tbody>\n<tr class=\"content\">\n<td style=\"padding: 20px; line-height: 24px; color: #888;\">Bonjour, <br /><br />Une demande d'annulation de la commande {{number}} a été formulé.</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style=\"width: 5%;\"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style=\"padding: 5px; text-align: center; width: 100%; font-size: 13px;\">                 © MyEnterprise - <a href=\"https://www.aquila-cms.com\" title=\"Aquila-CMS Opensource\" target=\"_blank\" rel=\"noopener\">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>",
                    subject : "Demande d'annulation"
                }
            }
        },
        {
            type        : 'sendRegisterForAdmin',
            code        : 'RegistrationNewCustomer',
            from        : 'nexistepas@aquila-cms.com',
            translation : {
                en : {
                    subject : 'New customer',
                    content : '<br />\n<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande;">\n<tbody>\n<tr class="header">\n<td style="width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;"><br /><span style="text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;">NEW CUSTOMER</span></td>\n</tr>\n<tr>\n<td>\n<table style="width: 100%; background-color: #eee;">\n<tbody>\n<tr>\n<td style="width: 5%;"></td>\n<td class="wrapper"><br />\n<table style="width: 100%; background-color: #fff; border: 1px solid #ddd;">\n<tbody>\n<tr class="content">\n<td style="padding: 20px; line-height: 24px; color: #888;">Hello,<br /><br />New customer : {{firstname}} {{lastname}}.</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style="width: 5%;"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style="padding: 5px; text-align: center; width: 100%; font-size: 13px;">© MyEnterprise - <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>'
                },
                fr : {
                    content : '<br />\n<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande;">\n<tbody>\n<tr class="header">\n<td style="width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;"><br /><span style="text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;">NOUVEAU CLIENT</span></td>\n</tr>\n<tr>\n<td>\n<table style="width: 100%; background-color: #eee;">\n<tbody>\n<tr>\n<td style="width: 5%;"></td>\n<td class="wrapper"><br />\n<table style="width: 100%; background-color: #fff; border: 1px solid #ddd;">\n<tbody>\n<tr class="content">\n<td style="padding: 20px; line-height: 24px; color: #888;">Bonjour,<br /><br />Nouveau client : {{firstname}} {{lastname}}</td>\n</tr>\n</tbody>\n</table>\n</td>\n<td style="width: 5%;"></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n<tr>\n<td style="padding: 5px; text-align: center; width: 100%; font-size: 13px;">© MonEntreprise - <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>',
                    subject : 'Nouveau client'
                }
            }
        },
        {
            type        : 'pendingCarts',
            translation : {
                fr : {
                    subject : 'Valider votre panier',
                    content : '<style>\n    #tabOrder tr {\n        text-align: center;\n    }\n</style>\n<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande;">\n<tbody>\n<tr class="header">\n<td style="width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;"><br /><span style="text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;">Valider votre panier</span></td>\n</tr>\n<tr>\n<td>\n<table style="width: 100%; background-color: #eee;">\n<tbody>\n<tr>\n<td style="width: 5%;"></td>\n<td class="wrapper"><br />\n<table style="width: 100%; background-color: #fff; border: 1px solid #ddd;">\n<tbody>\n<tr class="content">\n<td style="padding: 20px; line-height: 24px; color: #888;">Bonjour {{customer.firstname}} {{customer.lastname}}, <br />Votre panier est toujours accessible pour passer commande.<br /><br />\n<div id="tabOrder">\n<table style="width: 100%;">\n<tbody>\n<tr>\n<th>Article</th>\n<th>Quantité</th>\n<th>Prix unitaire {{taxdisplay}}</th>\n<th>Prix total {{taxdisplay}}</th>\n</tr>\n<!--startitems-->\n<tr>\n<th>{{product.name}}</th>\n<th>{{product.quantity}}</th>\n<th>{{product.unitPrice}}</th>\n<th>{{product.totalPrice}}</th>\n</tr>\n<!--enditems--></tbody>\n</table>\n</div>\n</td>\n</tr>\n<tr>\n<td style="padding: 5px; text-align: center; width: 100%; font-size: 13px;">© MonEnterprise - <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n</tbody>\n</table>'
                },
                en : {
                    content : '<style>\n    #tabOrder tr {\n        text-align: center;\n    }\n</style>\n<table class="email" style="width: 100%; margin: 0; font-family: LucidaGrande;">\n<tbody>\n<tr class="header">\n<td style="width: 100%; text-align: center; background-color: #fff; border-bottom-style: solid; border-bottom-width: 5px; border-bottom-color: #1432AA;"><br /><span style="text-transform: uppercase; color: #1432aa; line-height: 60px; font-size: 23px; font-weight: bold;">Validate your cart</span></td>\n</tr>\n<tr>\n<td>\n<table style="width: 100%; background-color: #eee;">\n<tbody>\n<tr>\n<td style="width: 5%;"></td>\n<td class="wrapper"><br />\n<table style="width: 100%; background-color: #fff; border: 1px solid #ddd;">\n<tbody>\n<tr class="content">\n<td style="padding: 20px; line-height: 24px; color: #888;">Hello {{customer.firstname}} {{customer.lastname}}, <br />Your shopping cart is always available for ordering.<br /><br />\n<div id="tabOrder">\n<table style="width: 100%;">\n<tbody>\n<tr>\n<th>Article</th>\n<th>Qty</th>\n<th>Unit price {{taxdisplay}}</th>\n<th>Total price {{taxdisplay}}</th>\n</tr>\n<!--startitems-->\n<tr>\n<th>{{product.name}}</th>\n<th>{{product.quantity}}</th>\n<th>{{product.unitPrice}}</th>\n<th>{{product.totalPrice}}</th>\n</tr>\n<!--enditems--></tbody>\n</table>\n</div>\n</td>\n</tr>\n<tr>\n<td style="padding: 5px; text-align: center; width: 100%; font-size: 13px;">© MyEnterprise - <a href="https://www.aquila-cms.com" title="Aquila-CMS Opensource" target="_blank" rel="noopener">powered by AquilaCMS</a></td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n</tbody>\n</table>\n</td>\n</tr>\n</tbody>\n</table>',
                    subject : 'Validate your cart'
                }
            },
            code : 'pendingCart',
            from : 'nexistepas@aquila-cms.com'
        }
    ];
    // Populate mails in BDD
    for (const mail of mailsTemplate) {
        await Mail.findOneAndUpdate({code: mail.code}, {$setOnInsert: mail}, {new: true, upsert: true});
    }

    /* ********** Payment methods ********** */
    const defaultPaymentMethods = [
        {
            code        : 'transfer',
            translation : {
                fr : {name: 'Virement', description: 'Virement bancaire requis dans un délais de 5 jours'},
                en : {name: 'Bank transfer', description: 'Bank transfer required within 5 days'}
            },
            active     : true,
            isDeferred : true
        },
        {
            code        : 'cheque',
            translation : {
                fr : {name: 'Chèque', description: 'Paiement par chèque à nous envoyer dans les 5 jours'},
                en : {name: 'Check', description: 'Payment by check to be sent to us within 5 days'}
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

    /* ********** Shipments ********** */
    const defaultCarrier = {
        preparation : {
            delay : 1,
            unit  : 'day'
        },
        type      : 'DELIVERY',
        active    : true,
        forAllPos : false,
        countries : [
            {
                country : 'FR',
                prices  : [
                    {
                        weight_min : 0,
                        weight_max : 99999,
                        price      : 2
                    }
                ],
                delay : 1,
                unit  : 'day'
            },
            {
                country : 'GB',
                prices  : [
                    {
                        weight_min : 0,
                        weight_max : 99999,
                        price      : 2
                    }
                ],
                delay : 1,
                unit  : 'day'
            }
        ],
        code        : 'default-carrier',
        translation : {
            en : {
                name : 'My carrier'
            },
            fr : {
                name : 'Mon transporteur'
            }
        },
        url_logo       : '',
        freePriceLimit : 50,
        vat_rate       : 20
    };
    await Shipments.findOneAndUpdate(
        {code: 'default-carrier'},
        {$setOnInsert: defaultCarrier},
        {new: true, upsert: true}
    );

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
        await AdminRights.findOneAndUpdate({code: right.code}, {$setOnInsert: right}, {new: true, upsert: true});
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
 * Allows you to populate cart items stock
 * @param {any[]} items
 */
const populateStockData = async (_id) => {
    const {Products} = require('../orm/models');
    const {stock}    = await Products.findById(_id.toString());
    delete stock.$init;

    if (global.aquila.envConfig?.stockOrder?.returnStockToFront === false) {
        const {qty_booked, qty_real, qty, $init, ...rest} = stock;
        return rest;
    }
    return stock;
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
                checkSlugLength,
                translationValidation
            } = schema.statics;
            if (typeof translationValidation === 'function' && elem._id) {
                await translationValidation(that, elem);
            }
            if (typeof checkCode === 'function') {
                await checkCode(elem);
            }
            if (typeof checkSlugExist === 'function') {
                await checkSlugExist(elem);
            }
            if (typeof checkSlugLength === 'function') {
                await checkSlugLength(elem);
            }
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
    preUpdates,
    testdb,
    checkSlugExist,
    checkSlugLength,
    checkCode,
    populateStockData
};