/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const NSErrors      = require('../../utils/errors/NSErrors');
const utilsDatabase = require('../../utils/database');
const Schema        = mongoose.Schema;
const {ObjectId}    = Schema.Types;

const PromoSchema = new Schema(
    {
        dateStart     : {type: Date}, // Date de début de la promo
        dateEnd       : {type: Date}, // Date de fin de la promo
        actif         : {type: Boolean, default: false}, // Si la promo est active ou pas
        type          : {type: String, enum: ['1', '2'], required: true, index: true}, // Promo panier (type: 1) ou catalogue (type: 2)
        name          : {type: String, required: true},
        description   : {type: String, required: true},
        discountValue : {type: Number}, // en Euro ou en % -> Si discountType === null alors discountValue ne doit pas être set
        discountType  : {type: String, enum: ['Aet', 'Aati', 'P', 'FVet', 'FVati', 'QtyB', null], default: null}, // A pour montant, P pour pourcentage, FV pour valeur finale, QtyB pour quantitybreak
        rules_id      : {type: ObjectId, ref: 'rules'}, // Régle pour appliquer ce prix
        gifts         : [{type: ObjectId, default: [], ref: 'products'}], // Liste d'ObjectId de produit offert
        codes         : [
            {
                code         : {type: String, required: true, sparse: true},
                limit_total  : {type: Number, default: null}, // Si null alors illimité -> ex: 10 bons de 50 euros seront offert
                limit_client : {type: Number, default: null}, // Si null alors illimité -> ex : 10 bons de 50 euros seront offert et 1 client pourra utiliser 10 bons (dans ce cas 1 client pourra utiliser tout les bons offert)
                used         : {type: Number, default: 0}, // nombre de fois ou le bon a été utilisé
                client_used  : {type: Number, default: 0} // Nombre de client unique ayant utilisé le bon
            }
        ],
        priority       : {type: Number, default: 0}, // priorité de la promo si cumulable, 0 étant le moins prioritaire
        applyNextRules : {type: Boolean, default: false}, // true : applique les autres promos, false : applique uniquement une seule promo
        actions        : [{type: ObjectId, default: [], ref: 'rules'}]
    },
    {
        timestamps : true,
        id         : false
    }
);
PromoSchema.index({dateStart: 1, dateEnd: 1, actif: 1, type: 1});
PromoSchema.index({isQuantityBreak: 1, actif: 1, type: 1});

PromoSchema.statics.checkCode = async function (that) {
    if (!that.name) {
        return;
    }
    const query = {name: that.name};
    if (that._id) {
        query._id = {$ne: that._id};
    }
    if (await mongoose.model('promo').exists(query)) {
        throw NSErrors.CodeExisting;
    }
};

PromoSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, PromoSchema);
});

PromoSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, PromoSchema);
});

PromoSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, PromoSchema);
});

module.exports = PromoSchema;