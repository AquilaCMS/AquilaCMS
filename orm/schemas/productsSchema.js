/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose                    = require('mongoose');
const {fs, aquilaEvents, slugify} = require('aql-utils');
const path                        = require('path');
const NSErrors                    = require('../../utils/errors/NSErrors');
const {
    checkCustomFields,
    checkTranslations
} = require('../../utils/translation');
const utilsDatabase               = require('../../utils/database');
const reviewService               = require('../../services/reviews');

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
            id           : {type: ObjectId, ref: 'attributes', index: true},
            code         : String,
            param        : String,
            type         : {type: String, default: 'unset'},
            translation  : {},
            position     : {type: Number, default: 1},
            visible      : {type: Boolean, default: true},
            usedInSearch : {type: Boolean, default: false},
            parents      : [{type: ObjectId, ref: 'attributes'}]
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
            extension        : {type: String, default: '.jpg'},
            content          : String
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
        views : {type: Number, default: 0},
        sells : {type: Number, default: 0}
    }
}, {
    discriminatorKey : 'type',
    timestamps       : true,
    usePushEach      : true,
    id               : false
});
ProductsSchema.index({_visible: 1, active: 1});

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
        if (item.selected_variant) {
            item.price = {
                unit : {
                    ati : item.selected_variant.price.ati.normal,
                    et  : item.selected_variant.price.et.normal
                },
                vat : {rate: item.selected_variant.price.tax}
            };
            if (item.selected_variant.price.et.special !== undefined && item.selected_variant.price.et.special !== null) {
                item.price.special = {
                    et  : item.selected_variant.price.et.special,
                    ati : item.selected_variant.price.ati.special
                };
            }
        } else {
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
    }
    const resp = await this.model('cart').findOneAndUpdate({_id: cart._id}, {$push: {items: item}}, {new: true});
    return resp;
};

ProductsSchema.methods.updateData = async function (data) {
    setPriceSort(data);

    // Slugify images name
    if (data.images) {
        for (const image of data.images) {
            image.title = slugify(image.title);
        }
        for (const prdImage of this.images) {
            if (!data.images.find((img) => img._id.toString() === prdImage._id.toString()) && prdImage.url) {
                // on delete les images cache generées depuis cette image
                await require('../../services/cache').deleteCacheImage('products', this);
                // puis on delete l'image original
                const joindPath = path.join(global.aquila.envConfig.environment.photoPath, prdImage.url);
                try {
                    await fs.unlinkSync(joindPath);
                } catch {
                    console.warn(`Unable to remove ${joindPath}`);
                }
            }
        }
    }

    let update;

    switch (data.type) {
    case 'simple':
        const ProductSimple = require('../models/productSimple');
        update              = new ProductSimple(data).preUpdateSimpleProduct(data);
        break;
    case 'bundle':
        const ProductBundle = require('../models/productBundle');
        update              = new ProductBundle(data).preUpdateBundleProduct(data);
        break;
    case 'virtual':
        const ProductVirtual = require('../models/productVirtual');
        update               = new ProductVirtual(data).preUpdateVirtualProduct(data);
        break;
    default:
        break;
    }

    reviewService.computeAverageRateAndCountReviews(update);

    const updPrd = await this.model(data.type).findOneAndUpdate({_id: this._id}, {$set: update}, {new: true});
    return updPrd;
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

ProductsSchema.statics.translationValidation = async function (self, updateQuery) {
    if (updateQuery) {
        if (updateQuery.translation === undefined) return; // No translation
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
                updateQuery.translation[lang.code] = {slug: slugify(correctCode)};
            }
            if (!updateQuery.translation[lang.code].slug) {
                updateQuery.translation[lang.code].slug = updateQuery.translation[lang.code].name ? slugify(updateQuery.translation[lang.code].name) : updateQuery.code;
            } else {
                updateQuery.translation[lang.code].slug = slugify(updateQuery.translation[lang.code].slug);
            }
            checkCustomFields(lang,  [
                {key: 'slug'}, {key: 'name'}, {key: 'title'}, {key: 'metaDesc'}, {key: 'canonical'}
            ]);

            if (updateQuery.translation[lang.code].description1) {
                checkTranslations(updateQuery.translation[lang.code].description1.title, 'description1.title');
                checkTranslations(updateQuery.translation[lang.code].description1.text, 'description1.text');
            }
            if (updateQuery.translation[lang.code].description2) {
                checkTranslations(updateQuery.translation[lang.code].description2.title, 'description2.title');
                checkTranslations(updateQuery.translation[lang.code].description2.text, 'description2.text');
            }
        }
    } else {
        if (self.translation === undefined) return; // No translation

        const translationKeys = Object.keys(self.translation);
        const languages       = await mongoose.model('languages').find({});
        for (const lang of languages) {
            if (!translationKeys.includes(lang.code)) {
                translationKeys.push(lang.code);
                self.translation[lang.code] = {slug: slugify(self.code)};
            }
            if (!self.translation[lang.code].slug) {
                self.translation[lang.code].slug = self.translation[lang.code].name ? slugify(self.translation[lang.code].name) : updateQuery.code;
            } else {
                self.translation[lang.code].slug = slugify(self.translation[lang.code].slug);
            }
            checkCustomFields(lang,  [
                {key: 'slug'}, {key: 'name'}, {key: 'title'}, {key: 'metaDesc'}, {key: 'canonical'}
            ]);

            if (self.translation[lang.code].description1) {
                checkTranslations(self.translation[lang.code].description1.title, 'description1.title');
                checkTranslations(self.translation[lang.code].description1.text, 'description1.text');
            }
            if (self.translation[lang.code].description2) {
                checkTranslations(self.translation[lang.code].description2.title, 'description2.title');
                checkTranslations(self.translation[lang.code].description2.text, 'description2.text');
            }
        }
    }
};

ProductsSchema.methods.hasVariantsValue = function (that) {
    return that ? (that.variants_values && that.variants_values.length > 0 && that.variants_values.find((vv) => vv.active)) : (this.variants_values && this.variants_values.length > 0 && this.variants_values.find((vv) => vv.active));
};

ProductsSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('products', that._id, that.code);
};

ProductsSchema.statics.checkSlugLength = async function (that) {
    await utilsDatabase.checkSlugLength(that, 'products');
};

ProductsSchema.statics.checkSlugExist = async function (that) {
    await utilsDatabase.checkSlugExist(that, 'products');
};

ProductsSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, ProductsSchema);
});

ProductsSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, ProductsSchema);
});

ProductsSchema.pre('save', async function (next) {
    setPriceSort(this);

    await utilsDatabase.preUpdates(this, next, ProductsSchema);
});

const setPriceSort = async (data) => {
    data.price.priceSort = {
        et  : data.price.et.special || data.price.et.normal,
        ati : data.price.ati.special || data.price.ati.normal
    };

    if (data.variants_values?.length > 0) {
        data.variants_values.forEach((variant) => {
            variant.price.priceSort = {
                et  : variant.price.et.special || variant.price.et.normal,
                ati : variant.price.ati.special || variant.price.ati.normal
            };
        });
    }
};

aquilaEvents.emit('productSchemaInit', ProductsSchema);

module.exports = ProductsSchema;