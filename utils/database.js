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
        {code: '', name: 'Aucun type', position: 0},
        {code: 'register', name: 'Inscription d\'un nouveau client', position: 1},
        {code: 'sendRegisterForAdmin', name: 'Inscription d\'un nouveau client pour l\'admin', position: 2},
        {code: 'orderSuccess', name: 'Commande validée (envoi du mail au client)', position: 3},
        {code: 'orderSuccessCompany', name: 'Commande validée (envoi du mail à l\'entreprise)', position: 4},
        {code: 'passwordRecovery', name: 'Récupération de votre mot de passe', position: 5},
        {code: 'contactMail', name: 'Mail de contact', position: 6},
        {code: 'changeOrderStatus', name: 'Changement de statut de la commande', position: 7},
        {code: 'rmaOrder', name: 'Réception retour produit', position: 8},
        {code: 'orderSent', name: 'Commande envoyée', position: 9},
        {code: 'orderSuccessDeferred', name: 'Commande avec paiement différé', position: 10},
        {code: 'activationAccount', name: 'Activation du compte', position: 11},
        {code: 'requestCancelOrderNotify', name: 'Demande d\'annulation de commande', position: 12}
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