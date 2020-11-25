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
            code     : '',
            name     : 'Aucun type',
            position : 0
        },
        {code        : 'register',
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
        {code        : 'sendRegisterForAdmin',
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
            }},
        {code        : 'orderSuccess', // TODO !
            position    : 3,
            translation : {
                fr : {
                    name      : 'Commande validée (envoi du mail au client)',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.line2',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.city',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.country',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery.price',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment.instruction',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        }
                    ]
                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.line2',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.city',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.country',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery.price',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment.instruction',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        }
                    ]

                }
            }},
        {code        : 'orderSuccessCompany', // TODO !
            position    : 4,
            translation : {
                fr : {
                    name      : 'Commande validée (envoi du mail à l\'entreprise)',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.line2',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.city',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.country',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery.price',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment.instruction',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.line2',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.city',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.country',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery.price',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment.instruction',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        }
                    ]

                }
            }},
        {code        : 'passwordRecovery',
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
                            description : 'Lien pour remplacer le mot de passe'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
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
            }},
        {code        : 'contactMail',
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
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'formDatas',
                            description : 'All the information in the contact form'
                        }
                    ]

                }
            }},
        {code        : 'changeOrderStatus',
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
                    name      : 'toDo',
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
            }},
        {code        : 'rmaOrder',
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
                    name      : 'toDo',
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
            }},
        {code        : 'orderSent',
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
                    name      : 'toDo',
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
                            description : 'toDTransporteur'
                        },
                        {
                            value       : 'date',
                            description : 'Send order'
                        },
                        {
                            value       : 'trackingUrl',
                            description : 'All the information in the contact form'
                        },
                        {
                            value       : 'number',
                            description : 'Numéro de la commande'
                        }
                    ]

                }
            }},
        {code        : 'orderSuccessDeferred', // TODO !
            position    : 10,
            translation : {
                fr : {
                    name      : 'Commande avec paiement différé',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.line2',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.city',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.country',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery.price',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment.instruction',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'address.line1',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.line2',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.companyName',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.complementaryInfo',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.zipcode',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.city',
                            description : 'toDo'
                        },
                        {
                            value       : 'address.country',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.customer.company',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery.price',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment.instruction',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        }
                    ]

                }
            }},
        {code        : 'activationAccount',
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
                    name      : 'toDo',
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
            }},
        {code        : 'requestCancelOrderNotify',
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
                    name      : 'toDo',
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
            }}
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
                en : {name: 'Bank transfer', urlLogo: imgTrans, description: 'Bank transfer required within 5 days'}},
            active     : true,
            isDeferred : true
        },
        {
            code        : 'cheque',
            translation : {
                fr : {name: 'Chèque', urlLogo: imgCheck, description: 'Paiement par chèque à nous envoyer dans les 5 jours'},
                en : {name: 'Check', urlLogo: imgCheck, description: 'Payment by check to be sent to us within 5 days'}},
            active     : true,
            isDeferred : true
        },
        {
            code        : 'cash',
            translation : {
                fr : {name: 'Espèces'},
                en : {name: 'Cash'}},
            active     : false,
            isDeferred : true
        }
    ];
    for (const paymentMethod of defaultPaymentMethods) {
        await PaymentMethods.findOneAndUpdate({code: paymentMethod.code}, {$setOnInsert: paymentMethod}, {new: true, upsert: true});
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
    populateItems,
    preUpdates,
    testdb
};