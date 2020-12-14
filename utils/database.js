const mongoose = require('mongoose');
mongoose.set('debug', false);
let connection = false;

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
        connection = true;
        await mongoose.connect(global.envFile.db, {
            useNewUrlParser    : true,
            useFindAndModify   : false,
            useCreateIndex     : true,
            useUnifiedTopology : true
        });
        mongoose.set('objectIdGetter', false);
    }

    return mongoose;
};

const testdb = async (uri_database) => {
    const mongoose = require('mongoose');
    await mongoose.connect(uri_database, {
        useNewUrlParser    : true,
        useFindAndModify   : false,
        useCreateIndex     : false,
        useUnifiedTopology : true
    });
};

/**
 * check if the database is a replicaSet, if we can use transactions
 */
// eslint-disable-next-line no-unused-vars
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

const initDBValues = async () => {
    const {
        SetAttributes,
        MailType,
        Languages,
        PaymentMethods,
        Statics
    } = require('../orm/models');

    console.log('Database init in progress...');
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

    await SetAttributes.findOneAndUpdate(
        {code: 'defaut'},
        {$setOnInsert: {code: 'defaut', name: 'Défaut', type: 'products', attributes: []}},
        {new: true, upsert: true}
    );
    await Statics.findOneAndUpdate({code: 'home'}, {
        $setOnInsert : {
            code        : 'home',
            type        : 'home',
            active      : true,
            translation : {[global.defaultLang]: {name: 'home', slug: 'home'}}
        }
    }, {new: true, upsert: true});

    const mailTypes = [
        {
            code        : '',
            translation : {
                fr : {
                    name : 'Aucun type'
                },
                en : {
                    name : 'Aucun type'
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
                            value       : 'activate_account_token',
                            description : 'Lien d\'activation du compte'
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
                            value       : 'activate_account_token',
                            description : 'Account activation link'
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
                            value       : 'order.delivery.price',
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
                            value       : 'order.delivery.price',
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
                            value       : 'order.delivery.price',
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
                            value       : 'order.delivery.price',
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
                            value       : 'tokenlink',
                            description : 'Lien pour changer le mot de passe'
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
                            value       : 'tokenlink',
                            description : 'Recovery password link'
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
                            value       : 'sstatus',
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
                            value       : 'order.delivery.price',
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
                            value       : 'order.delivery.price',
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
                            value       : 'activate_account_token',
                            description : 'Lien d\'activation du compte'
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
                            value       : 'activate_account_token',
                            description : 'Account activation link'
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
        }
    ];
    // Populate mailType in BDD
    for (const mailType of mailTypes) {
        await MailType.findOneAndUpdate({code: mailType.code}, {$setOnInsert: mailType}, {new: true, upsert: true});
    }

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
};

const applyMigrationIfNeeded = async () => {
    try {
        const {migrationScripts} = require('./migration');
        const config             =  await mongoose.connection
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
 * Permet de faire un populate des champs spécifiques de chaque item
 * @param {array} items
 */
const populateItems = async (items) => {
    for (const item of items) {
        await item.populateItem();
    }
};

/**
 * called during pre hooks for `findOneAndUpdate` and/or `updateOne`
 * @param {mongoose.Query<any>} that query to check
 * @param {mongoose.HookNextFunction} next hooks function
 * @param {mongoose.Schema<any>} model schema needed to be check for translation validation
 * @return {mongoose.HookNextFunction} HookNextFunction
 */
const preUpdates = async (that, next, model) => {
    if (that.getUpdate() && (that.getUpdate()._id || (that.getUpdate().$set && that.getUpdate().$set._id))) {
        const errors = await model.statics.translationValidation(that.getUpdate().$set || that.getUpdate(), that);
        return next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
    }
    return next();
};

module.exports = {
    connect,
    // checkIfReplicaSet,
    initDBValues,
    applyMigrationIfNeeded,
    populateItems,
    preUpdates,
    testdb
};