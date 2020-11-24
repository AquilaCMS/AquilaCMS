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
                            description : 'toDo'
                        },
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'name',
                            description : 'toDo'
                        },
                        {
                            value       : 'activate_account_token',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'login',
                            description : 'toDo'
                        },
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'name',
                            description : 'toDo'
                        },
                        {
                            value       : 'activate_account_token',
                            description : 'toDo'
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
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'login',
                            description : 'toDo'
                        },
                        {
                            value       : 'name',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'login',
                            description : 'toDo'
                        },
                        {
                            value       : 'name',
                            description : 'toDo'
                        }
                    ]

                }
            }},
        {code        : 'orderSuccess',
            position    : 3,
            translation : {
                fr : {
                    name      : 'Commande validée (envoi du mail au client)',
                    variables : [
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        },
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
                        },
                        {
                            value       : 'dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'address',
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
                            value       : 'order.customer.fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.shipment',
                            description : 'toDo'
                        },
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
                            value       : 'totalamount',
                            description : 'toDo'
                        },
                        {
                            value       : 'orderdata',
                            description : 'toDo'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment_type',
                            description : 'toDo'
                        },
                        {
                            value       : 'delivery_type',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        },
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
                        },
                        {
                            value       : 'dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'address',
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
                            value       : 'order.customer.fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.shipment',
                            description : 'toDo'
                        },
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
                            value       : 'totalamount',
                            description : 'toDo'
                        },
                        {
                            value       : 'orderdata',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment_type',
                            description : 'toDo'
                        },
                        {
                            value       : 'delivery_type',
                            description : 'toDo'
                        }
                    ]

                }
            }},
        {code        : 'orderSuccessCompany',
            position    : 4,
            translation : {
                fr : {
                    name      : 'Commande validée (envoi du mail à l\'entreprise)',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
                        },
                        {
                            value       : 'dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'address',
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
                            value       : 'order.customer.fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.shipment',
                            description : 'toDo'
                        },
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
                            value       : 'totalamount',
                            description : 'toDo'
                        },
                        {
                            value       : 'orderdata',
                            description : 'toDo'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment_type',
                            description : 'toDo'
                        },
                        {
                            value       : 'delivery_type',
                            description : 'toDo'
                        },
                        {
                            value       : 'shipment',
                            description : 'toDo'
                        },
                        {
                            value       : 'customer_mobile_phone',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
                        },
                        {
                            value       : 'dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'address',
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
                            value       : 'order.customer.fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.shipment',
                            description : 'toDo'
                        },
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
                            value       : 'totalamount',
                            description : 'toDo'
                        },
                        {
                            value       : 'orderdata',
                            description : 'toDo'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment_type',
                            description : 'toDo'
                        },
                        {
                            value       : 'delivery_type',
                            description : 'toDo'
                        },
                        {
                            value       : 'shipment',
                            description : 'toDo'
                        },
                        {
                            value       : 'customer_mobile_phone',
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
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'tokenlink',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'tokenlink',
                            description : 'toDo'
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
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'formDatas',
                            description : 'toDo'
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
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'status',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'status',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
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
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'refund',
                            description : 'toDo'
                        },
                        {
                            value       : 'articles',
                            description : 'toDo'
                        },
                        {
                            value       : 'date',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'refund',
                            description : 'toDo'
                        },
                        {
                            value       : 'articles',
                            description : 'toDo'
                        },
                        {
                            value       : 'date',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
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
                            value       : 'fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'address',
                            description : 'toDo'
                        },
                        {
                            value       : 'transporterName',
                            description : 'toDo'
                        },
                        {
                            value       : 'date',
                            description : 'toDo'
                        },
                        {
                            value       : 'trackingUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'address',
                            description : 'toDo'
                        },
                        {
                            value       : 'transporterName',
                            description : 'toDo'
                        },
                        {
                            value       : 'date',
                            description : 'toDo'
                        },
                        {
                            value       : 'trackingUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
                        }
                    ]

                }
            }},
        {code        : 'orderSuccessDeferred',
            position    : 10,
            translation : {
                fr : {
                    name      : 'Commande avec paiement différé',
                    variables : [
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        },
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
                        },
                        {
                            value       : 'dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'address',
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
                            value       : 'order.customer.fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.shipment',
                            description : 'toDo'
                        },
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
                            value       : 'totalamount',
                            description : 'toDo'
                        },
                        {
                            value       : 'orderdata',
                            description : 'toDo'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment_type',
                            description : 'toDo'
                        },
                        {
                            value       : 'delivery_type',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment.instruction',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        },
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'number',
                            description : 'toDo'
                        },
                        {
                            value       : 'dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'address',
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
                            value       : 'order.customer.fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.number',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.dateReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.hourReceipt',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.priceTotal',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.delivery',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentMode',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.paymentDescription',
                            description : 'toDo'
                        },
                        {
                            value       : 'order.shipment',
                            description : 'toDo'
                        },
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
                            value       : 'totalamount',
                            description : 'toDo'
                        },
                        {
                            value       : 'orderdata',
                            description : 'toDo'
                        },
                        {
                            value       : 'taxdisplay',
                            description : 'toDo'
                        },
                        {
                            value       : 'appUrl',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment_type',
                            description : 'toDo'
                        },
                        {
                            value       : 'delivery_type',
                            description : 'toDo'
                        },
                        {
                            value       : 'payment.instruction',
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
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'name',
                            description : 'toDo'
                        },
                        {
                            value       : 'activate_account_token',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'name',
                            description : 'toDo'
                        },
                        {
                            value       : 'activate_account_token',
                            description : 'toDo'
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
                            description : 'toDo'
                        },
                        {
                            value       : 'status',
                            description : 'toDo'
                        },
                        {
                            value       : 'fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'name',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
                        }
                    ]

                },
                en : {
                    name      : 'toDo',
                    variables : [
                        {
                            value       : 'number',
                            description : 'toDo'
                        },
                        {
                            value       : 'status',
                            description : 'toDo'
                        },
                        {
                            value       : 'fullname',
                            description : 'toDo'
                        },
                        {
                            value       : 'name',
                            description : 'toDo'
                        },
                        {
                            value       : 'company',
                            description : 'toDo'
                        },
                        {
                            value       : 'firstname',
                            description : 'toDo'
                        },
                        {
                            value       : 'lastname',
                            description : 'toDo'
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