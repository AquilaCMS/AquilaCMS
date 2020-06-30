const mongoose = require("mongoose");
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
        try {
            connection = true;
            await mongoose.connect(global.envFile.db, {
                useNewUrlParser    : true,
                useFindAndModify   : false,
                useCreateIndex     : true,
                useUnifiedTopology : true
            });
            mongoose.set("objectIdGetter", false);
        } catch (err) {
            console.error(err);
        }
    }

    return mongoose;
};

/**
 * check if the database is a replicaSet, if we can use transactions
 */
// eslint-disable-next-line no-unused-vars
/* const checkIfReplicaSet = async () => {
    return new Promise(async (resolve, reject) => {
        const conn = mongoose.connection;
        conn.on('error', (err) => reject(err));
        conn.on('open', () => {
            // eslint-disable-next-line no-unused-vars
            conn.db.command({replSetGetStatus: 0}, (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(true);
            });
        });
    });
}; */

const initDBValues = async () => {
    const {SetAttributes, MailType, Languages, Configuration, PaymentMethods, Statics} = require('../orm/models');

    console.log('Database init in progress...');
    const _lang = await Languages.findOne({defaultLanguage: true});
    if (!_lang) {
        const oLang = {code: 'fr', name: 'Français', defaultLanguage: true, status: 'visible'};
        await Languages.create(oLang);
        global.defaultLang = oLang.code;
    } else {
        global.defaultLang = _lang.code;
    }

    const _default = await SetAttributes.findOne({code: 'defaut'});
    if (!_default) {
        await SetAttributes.create({code: 'defaut', name: 'Défaut', type: 'products', attributes: []});
    }
    const configuration = await Configuration.findOne({"environment.currentTheme": {$regex: /custom_themes\/.*/, $options: 'i'}});
    if (configuration) {
        configuration.environment.currentTheme = configuration.environment.currentTheme.replace('custom_themes/', '');
        global.envConfig = configuration.toObject();
        await configuration.save();
    }
    await Configuration.findOneAndUpdate({"stockOrder.cartExpireTimeout": {$exists: false}}, {$set: {"stockOrder.cartExpireTimeout": 48}});
    await Configuration.findOneAndUpdate({"stockOrder.pendingOrderCancelTimeout": {$exists: false}}, {$set: {"stockOrder.pendingOrderCancelTimeout": 48}});
    await Configuration.findOneAndUpdate({$or: [{taxerate: {$exists: false}}, {"taxerate.0": {$exists: false}}]}, {$set: {taxerate: [{rate: 5.5}, {rate: 10}, {rate: 20}]}});
    await Configuration.findOneAndUpdate({
        $or : [
            {stockOrder: null},
            {"stockOrder.labels": null},
            {"stockOrder.labels": {$size: 0}}
        ]
    },
    {
        $set : {
            "stockOrder.labels" : [
                {
                    code        : "available",
                    translation : {
                        fr : {value: "Produit disponible"},
                        en : {value: "Available product"}
                    }
                },
                {
                    code        : "availableFrom",
                    translation : {
                        en : {value: "Available from {date}"},
                        fr : {value: "Disponible à partir du {date}"}
                    }
                },
                {
                    code        : "replenished",
                    translation : {
                        en : {value: "Product being replenished"},
                        fr : {value: "Produit en cours de réapprovisionnement"}
                    }
                },
                {
                    code        : "exhausted",
                    translation : {
                        en : {value: "Product permanently exhausted"},
                        fr : {value: "Produit définitivement épuisé"}
                    }
                }
            ]
        }
    });

    const homePage = {code: "home", type: "page", active: true, translation: {}};
    homePage.translation[global.defaultLang] = {name: "home", slug: "home"};
    if (!await Statics.findOne({code: 'home'})) {
        await Statics.create(homePage);
    }
    // Permet de créer les types de mails (collection mailType) en base de données
    const mailTypes = [
        {code: '', name: 'Aucun type', position: 0},
        {code: 'register', name: "Inscription d'un nouveau client", position: 1},
        {code: 'sendRegisterForAdmin', name: "Inscription d'un nouveau client pour l'admin", position: 2},
        {code: 'orderSuccess', name: 'Commande validée (envoi du mail au client)', position: 3},
        {code: 'orderSuccessCompany', name: "Commande validée (envoi du mail à l'entreprise)", position: 4},
        {code: 'passwordRecovery', name: 'Récupération de votre mot de passe', position: 5},
        {code: 'contactMail', name: 'Mail de contact', position: 6},
        {code: 'changeOrderStatus', name: 'Changement de statut de la commande', position: 7},
        {code: 'rmaOrder', name: 'Réception retour produit', position: 8},
        {code: 'orderSent', name: 'Commande envoyée', position: 9},
        {code: 'orderSuccessDeferred', name: 'Commande avec paiement différé', position: 10},
        {code: 'activationAccount', name: 'Activation du compte', position: 11}
    ];
    // P1 : Utiliser des codes normé ci dessous
    /*   const mailTypes = [
        {code: '', name: 'Aucun type', position: 0},
        {code: 'clientRegister', name: "Inscription d'un nouveau client", position: 1},
        {code: 'clientRegisterAdmin', name: "Inscription d'un nouveau client pour l'admin", position: 2},
        {code: 'clientActivate', name: 'Activation du compte', position: 11},
        {code: 'orderSuccess', name: 'Commande validée (envoi du mail au client)', position: 3},
        {code: 'orderSuccessAdmin', name: "Commande validée (envoi du mail à l'entreprise)", position: 4},
        {code: 'orderSuccessDeferred', name: 'Commande avec paiement différé', position: 10},
        {code: 'passwordRecovery', name: 'Récupération de votre mot de passe', position: 5},
        {code: 'contactAdmin', name: 'Mail de contact', position: 6},
        {code: 'orderStatus', name: 'Changement de statut de la commande', position: 7},
        {code: 'orderRMA', name: 'Réception retour produit', position: 8},
        {code: 'orderSent', name: 'Commande envoyée', position: 9}
    ]; */
    for (const mailType of mailTypes) {
        if (!(await MailType.findOne({code: mailType.code}))) {
            await MailType.create(mailType);
        }
    }

    const imgTrans = "/medias/paiement-virement-logo.png";
    const imgCheck = "/medias/paiement-cheque-logo.png ";
    const defaultPaymentMethods = [
        {code: 'transfer', translation: {fr: {name: 'Virement', urlLogo: imgTrans, description: "Virement bancaire requis dans un délais de 5 jours"}, en: {name: 'Bank transfer', urlLogo: imgTrans}}, active: true, isDeferred: true},
        {code: 'cheque', translation: {fr: {name: 'Chèque', urlLogo: imgCheck, description: "Paiement par chèque à nous envoyer dans les 5 jours"}, en: {name: 'Check', urlLogo: imgCheck}}, active: true, isDeferred: true},
        {code: 'cash', translation: {fr: {name: 'Espèces'}, en: {name: 'Cash'}}, active: false, isDeferred: true}
    ];
    for (const paymentMethod of defaultPaymentMethods) {
        if (!(await PaymentMethods.findOne({code: paymentMethod.code}))) {
            await PaymentMethods.create(paymentMethod);
        }
    }
};

// Permet de faire un populate des champs spécifiques de chaque item
const populateItems = async (items) => {
    for (const item of items) {
        await item.populateItem();
    }
};

/**
 * Fonction appelée avant l'update des mails, categories, news, paymentMethods & statics
 */
const preUpdates = async (that, next, model) => {
    if (that.getUpdate() && (that.getUpdate()._id || (that.getUpdate().$set && that.getUpdate().$set._id))) {
        const errors = await model.statics.translationValidation(that.getUpdate().$set || that.getUpdate(), that);
        return next(errors.length > 0 ? new Error(errors.join("\n")) : undefined);
    }
    return next();
};

module.exports = {
    connect,
    // checkIfReplicaSet,
    initDBValues,
    populateItems,
    preUpdates
};