/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose            = require('mongoose');
const {aquilaEvents}      = require('aql-utils');
const {checkCustomFields} = require('../../utils/translation');
const utilsDatabase       = require('../../utils/database');
const Schema              = mongoose.Schema;

const PaymentMethodsSchema = new Schema({
    code                     : {type: String, unique: true, required: true},
    active                   : {type: Boolean, default: false},
    details                  : {}, // Contient les infos propres au mode de paiement
    component_template       : String, // Contient le formulaire pour configurer le mode de paiement
    makePayment              : String, // L'url qu'il faut appeler en GET pour débuter le paiement
    isDeferred               : {type: Boolean, default: false}, // Si le paiement est différée
    sort                     : {type: Number, default: 0},
    translation              : {},
    component_template_front : {type: String, default: null},
    moduleFolderName         : {type: String, default: null},
    paymentServiceFileName   : {type: String, default: null}
}, {
    id : false
});

/* translation:
 name
 urlLogo
 description
 instruction
 */

PaymentMethodsSchema.statics.translationValidation = async function (self) {
    if (self.translation === undefined) return; // No translation

    let translationKeys = Object.keys(self.translation);

    if (translationKeys.length === 0) {
        self.translation[global.aquila.defaultLang] = {};
        translationKeys                             = Object.keys(self.translation);
    }

    for (let i = 0; i < translationKeys.length; i++) {
        if (Object.keys(self.translation[translationKeys[i]]).length > 0) {
            checkCustomFields(self.translation[translationKeys[i]], `translation.${translationKeys[i]}`, [
                {key: 'name'}, {key: 'urlLogo'}, {key: 'description'}, {key: 'instruction'}
            ]);
        }
    }
};

PaymentMethodsSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, PaymentMethodsSchema);
});
PaymentMethodsSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, PaymentMethodsSchema);
});

aquilaEvents.emit('paymentMethodSchemaInit', PaymentMethodsSchema);

module.exports = PaymentMethodsSchema;