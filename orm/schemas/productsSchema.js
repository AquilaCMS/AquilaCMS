/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const fs            = require('../../utils/fsp');
const aquilaEvents  = require('../../utils/aquilaEvents');
const NSErrors      = require('../../utils/errors/NSErrors');
const utils         = require('../../utils/utils');
const {
    checkCustomFields,
    checkTranslations
} = require('../../utils/translation');
const utilsDatabase = require('../../utils/database');

const Schema     = mongoose.Schema;
const {ObjectId} = Schema.Types;

const ProductsSchema = new Schema({
    code               : {type: String, required: true, unique: true},
    trademark          : {code: String, name: String},
    supplier_ref       : {type: ObjectId, ref: 'suppliers'},
    supplier_code      : {type: String},
    type               : {type: String, enum: ['simple', 'bundle', 'virtual']},
    active             : {type: Boolean, default: true},
    _visible           : {type: Boolean, default: false},
    universe           : String,
    family             : String,
    subfamily          : String,
    component_template : String,
    weight             : {type: Number, default: 0}, // Le poids du produit
    price              : {
        purchase : Number,
        tax      : Number,
        et       : {
            normal  : Number,
            special : Number
        },
        ati : {
            normal  : Number,
            special : Number
        },
        priceSort : {
            et  : {type: Number, default: 0},
            ati : {type: Number, default: 0}
        }
    },
    associated_prds : [{type: ObjectId, ref: 'products'}],
    set_attributes  : {type: ObjectId, ref: 'setAttributes', index: true},
    attributes      : [
        {
            id          : {type: ObjectId, ref: 'attributes', index: true},
            code        : String,
            values      : String,
            param       : String,
            type        : {type: String, default: 'unset'},
            translation : {},
            position    : {type: Number, default: 1},
            visible     : {type: Boolean, default: true}
        }
    ], // Module Options
    images : [
        {
            url              : String,
            name             : String,
            title            : String,
            alt              : String,
            position         : Number,
            modificationDate : String,
            default          : {type: Boolean, default: false},
            extension        : {type: String, default: '.jpg'}
        }
    ],
    code_ean    : String,
    is_new      : {type: Boolean, default: false},
    translation : {},
    pictos      : [{
        code     : String,
        image    : String,
        title    : String,
        location : String,
        pictoId  : {type: ObjectId, ref: 'pictos'}
    }],
    reviews : {
        average    : {type: Number, default: 0},
        reviews_nb : {type: Number, default: 0},
        // les questions actuellements en cours pour ce produit
        questions  : [{
            translation : {}, // question   : {type: String, required: true},
            idQuestion  : {type: ObjectId, required: true},
            average     : {type: Number, default: 0}
        }],
        datas : [{
            id_review   : {type: String},
            name        : {type: String},
            id_client   : {type: ObjectId}, // Si on peut l’avoir avec avisverifies c’est cool
            ip_client   : {type: String},
            review_date : {type: Date, default: Date.now},
            review      : {type: String},
            lang        : {type: String},
            rate        : {type: Number},
            order_ref   : {type: String}, // Non affiché, juste pour “stats”
            title       : {type: String}, // Ca existe avec avisverif ?
            visible     : {type: Boolean, default: true}, // Ne sert pas pour avisverif. Mettre à true par defo pr avisverif
            verify      : {type: Boolean, default: true}, // Ne sert pas pour avisverif. Mettre à true par defo pr avisverif
            questions   : [{
                question   : {type: String, required: true},
                idQuestion : {type: ObjectId, required: true},
                rate       : {type: Number, default: 0}
            }]
        }]
    },
    stats : {
        views : {type: Number, default: 0}
    }
}, {
    discriminatorKey : 'kind',
    timestamps       : true,
    usePushEach      : true,
    id               : false
});
ProductsSchema.index({_visible: 1, active: 1});
// ProductsSchema.index({
//     code        : 'text',
//     trademark   : 'text',
//     code_ean    : 'text',
// }, {name: 'textSearchIndex', default_language: 'french'});

ProductsSchema.statics.translationValidation = async function (updateQuery, self) {
    let errors = [];

    // if (self._collection && !self._collection.collectionName.includes('preview')) {
    if (updateQuery) {
        while (updateQuery.translation === undefined) {
            updateQuery.translation = {};
        }
        const languages       = await mongoose.model('languages').find({});
        const translationKeys = Object.keys(updateQuery.translation);
        for (const lang of languages) {
            if (!translationKeys.includes(lang.code)) {
                translationKeys.push(lang.code);
                let correctCode;
                // when we want the preview of a product
                // the updateQuery object don't have the code (only updatedAt)
                // so we need to get the code to update and get the preview !
                if (typeof updateQuery.code === 'undefined') {
                    if (self && self._update && self._update.code) {
                        correctCode = self._update.code;
                    }
                } else {
                    correctCode = updateQuery.code;
                }
                updateQuery.translation[lang.code] = {slug: utils.slugify(correctCode)};
            }
            if (!updateQuery.translation[lang.code].slug) {
                updateQuery.translation[lang.code].slug = updateQuery.translation[lang.code].name ? utils.slugify(updateQuery.translation[lang.code].name) : updateQuery.code;
            } else {
                updateQuery.translation[lang.code].slug = utils.slugify(updateQuery.translation[lang.code].slug);
            }
            if (updateQuery.translation[lang.code].slug.length <= 2) {
                errors.push('slug trop court');
                return errors;
            }
            if (await mongoose.model('products').countDocuments({_id: {$ne: updateQuery._id}, [`translation.${lang.code}.slug`]: updateQuery.translation[lang.code].slug}) > 0) {
                errors.push('slug déjà existant');
            }
            errors = errors.concat(checkCustomFields(lang, 'translation.lationKeys[i]}', [
                {key: 'slug'}, {key: 'name'}, {key: 'title'}, {key: 'metaDesc'}, {key: 'canonical'}
            ]));

            if (updateQuery.translation[lang.code].description1) {
                errors = checkTranslations(updateQuery.translation[lang.code].description1.title, 'description1.title', errors, translationKeys[lang.code]);
                errors = checkTranslations(updateQuery.translation[lang.code].description1.text, 'description1.text', errors, translationKeys[lang.code]);
            }
            if (updateQuery.translation[lang.code].description2) {
                errors = checkTranslations(updateQuery.translation[lang.code].description2.title, 'description2.title', errors, translationKeys[lang.code]);
                errors = checkTranslations(updateQuery.translation[lang.code].description2.text, 'description2.text', errors, translationKeys[lang.code]);
            }
        }
    } else {
        while (self.translation === undefined) {
            self.translation = {};
        }
        const translationKeys = Object.keys(self.translation);
        const languages       = await mongoose.model('languages').find({});
        for (const lang of languages) {
            if (!translationKeys.includes(lang.code)) {
                translationKeys.push(lang.code);
                self.translation[lang.code] = {slug: utils.slugify(self.code)};
            }
            if (!self.translation[lang.code].slug) {
                self.translation[lang.code].slug = self.translation[lang.code].name ? utils.slugify(self.translation[lang.code].name) : updateQuery.code;
            } else {
                self.translation[lang.code].slug = utils.slugify(self.translation[lang.code].slug);
            }
            if (self.translation[lang.code].slug.length <= 2) {
                errors.push(`slug '${lang.code}' trop court`);
                return errors;
            }
            if (await mongoose.model('products').countDocuments({_id: {$ne: self._id}, [`translation.${lang.code}.slug`]: self.translation[lang.code].slug}) > 0) {
                errors.push(`slug '${lang.code}' déjà existant`);
            }
            errors = errors.concat(checkCustomFields(lang, 'translation.lationKeys[i]}', [
                {key: 'slug'}, {key: 'name'}, {key: 'title'}, {key: 'metaDesc'}, {key: 'canonical'}
            ]));

            if (self.translation[lang.code].description1) {
                errors = checkTranslations(self.translation[lang.code].description1.title, 'description1.title', errors, translationKeys[lang.code]);
                errors = checkTranslations(self.translation[lang.code].description1.text, 'description1.text', errors, translationKeys[lang.code]);
            }
            if (self.translation[lang.code].description2) {
                errors = checkTranslations(self.translation[lang.code].description2.title, 'description2.title', errors, translationKeys[lang.code]);
                errors = checkTranslations(self.translation[lang.code].description2.text, 'description2.text', errors, translationKeys[lang.code]);
            }
        }
    }
    // }
    return errors;
};

async function preUpdates(that) {
    await utilsDatabase.checkCode('products', that._id, that.code);
    await utilsDatabase.checkSlugExist(that, 'products');
}

ProductsSchema.pre('findOneAndUpdate', async function (next) {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
    // suppression des images en cache si la principale est supprimée
    if (this.getUpdate().$set && this.getUpdate().$set._id) {
        const oldPrd = await mongoose.model('products').findOne({_id: this.getUpdate().$set._id.toString()});
        for (let i = 0; i < oldPrd.images.length; i++) {
            if (this.getUpdate().$set.images) {
                if (this.getUpdate().$set.images.findIndex((img) => oldPrd.images[i]._id.toString() === img._id.toString()) === -1) {
                    try {
                        await fs.unlink(`${require('../../utils/server').getUploadDirectory()}/temp/${oldPrd.images[i].url}`);
                    } catch (error) {
                        console.log(error);
                    }
                    try {
                        require('../../services/cache').deleteCacheImage('products', {_id: oldPrd.images[i]._id.toString(), code: oldPrd.code});
                    } catch (error) {
                        console.log(error);
                    }
                }
            }
        }
    }
    await utilsDatabase.preUpdates(this, next, ProductsSchema);
});

ProductsSchema.pre('updateOne', async function (next) {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
    utilsDatabase.preUpdates(this, next, ProductsSchema);
});

ProductsSchema.pre('save', async function (next) {
    this.price.priceSort = {
        et  : this.price.et.special || this.price.et.normal,
        ati : this.price.ati.special || this.price.ati.normal
    };
    const errors         = await ProductsSchema.statics.translationValidation(undefined, this);
    await preUpdates(this);
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

ProductsSchema.methods.basicAddToCart = async function (cart, item, user, lang) {
    /** Quantity <= 0 not allowed on creation * */
    if (item.quantity <= 0) {
        throw NSErrors.CartQuantityError;
    }
    const ServicePromo = require('../../services/promo');
    let prd            = [item];
    if (item.type !== 'bundle') {
        prd = await ServicePromo.checkPromoCatalog(prd, user, lang);
        if (prd && prd[0] && prd[0].type !== 'bundle' && prd[0].price) {
            if (prd[0].price.et && prd[0].price.et.special !== undefined) {
                this.price.et.special = prd[0].price.et.special;
            }
            if (prd[0].price.ati && prd[0].price.ati.special !== undefined) {
                this.price.ati.special = prd[0].price.ati.special;
            }
        }
        item.price = {
            vat  : {rate: this.price.tax},
            unit : {
                et  : this.price.et.normal,
                ati : this.price.ati.normal
            }
        };

        if (this.price.et.special !== undefined && this.price.et.special !== null) {
            item.price.special = {
                et  : this.price.et.special,
                ati : this.price.ati.special
            };
        }
    }
    const resp = await this.model('cart').findOneAndUpdate({_id: cart._id}, {$push: {items: item}}, {new: true});
    return resp;
};

ProductsSchema.statics.searchBySupplierRef = function (supplier_ref, cb) {
    this.find({supplier_ref}, cb);
};

ProductsSchema.statics.updateSupplier = async function (supplierId, supplierName) {
    const query = {id_supplier: supplierId};
    await this.updateMany(query, {_supplier: supplierName});
};

ProductsSchema.statics.updateTrademark = async function (trademarkId, trademarkName) {
    const query = {id_trademark: trademarkId};
    await this.updateMany(query, {_trademark: trademarkName});
};

aquilaEvents.emit('productSchemaInit', ProductsSchema);

module.exports = ProductsSchema;