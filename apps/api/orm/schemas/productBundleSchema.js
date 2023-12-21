/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose       = require('mongoose');
const {aquilaEvents} = require('aql-utils');
const NSErrors       = require('../../utils/errors/NSErrors');
const Schema         = mongoose.Schema;
const {ObjectId}     = Schema.Types;

const ProductBundleSchema = new Schema({
    qty             : {type: Number},
    bundle_sections : [
        {
            ref         : {type: String, required: true},
            title       : {type: String},
            displayMode : {type: String, enum: ['RADIO_BUTTON', 'SELECT']}, // Ne sert que pour le type 'SINGLE'
            type        : {type: String, enum: ['SINGLE', 'MULTIPLE']},
            products    : [{
                id             : {type: ObjectId, ref: 'products'},
                isDefault      : Boolean,
                modifier_price : {
                    ati : {type: Number},
                    et  : {type: Number}
                },
                modifier_weight : {type: Number}
            }],
            isRequired : Boolean,
            minSelect  : Number,
            maxSelect  : Number
        }
    ],
    stock : {
        date_selling : Date,
        date_supply  : Date,
        orderable    : {type: Boolean, default: false},
        status       : {type: String, default: 'liv', enum: ['liv', 'dif', 'epu']},
        label        : String,
        translation  : {}
    }
}, {
    discriminatorKey : 'type',
    id               : false
});

// LATER, calsulate qty and disponibility from child products on retrieving product
/* ProductBundleSchema.virtual("stock").get(function () {
    return this.stock.qty - this.stock.qty_booked;
}); */

ProductBundleSchema.methods.addToCart = async function (cart, item, user, lang) {
    if (!item.selections) {
        throw NSErrors.ProductInvalid;
    }
    // Il ne faut pas pouvoir ajouter des produits qui ne sont reliés à aucune section
    item.selections = item.selections.filter((selection) => this.bundle_sections.find((section) => selection.bundle_section_ref === section.ref) !== undefined);
    // TODO : You can't have two sections with the same reference
    // We validate products that are linked to sections
    let isValid = true;
    let i       = 0;
    while (isValid && i < this.bundle_sections.length) {
        isValid = validateBySection(this.bundle_sections[i], item);
        i++;
    }
    if (!isValid) {
        throw NSErrors.ProductInvalid;
    }
    // on check que les section son commandable si le stock est géré
    if (global.aquila.envConfig.stockOrder.bookingStock === 'panier') {
        for (let i = 0; i < item.selections.length; i++) {
            const selectionProducts = item.selections[i].products;
            // on check que chaque produit soit commandable
            for (let j = 0; j < selectionProducts.length; j++) {
                const ServicesProducts = require('../../services/products');
                const selectionProduct = await this.model('products').findOne({_id: selectionProducts[j]});
                if (selectionProduct.type === 'simple') {
                    if (
                        !(await ServicesProducts.checkProductOrderable(selectionProducts[j], item.quantity, item.selected_variant)).ordering.orderable
                        || !(await ServicesProducts.checkProductOrderable(item.stock, null, item.selected_variant))
                    ) throw NSErrors.ProductNotOrderable;
                    await ServicesProducts.updateStock(selectionProducts[j], -item.quantity, undefined, item.selected_variant);
                }
            }
        }
    }
    const modifiers = await this.getBundlePrdsModifiers(item.selections);
    item.price      = {
        vat  : {rate: this.price.tax},
        unit : {et: this.price.et.normal + modifiers.price.et, ati: this.price.ati.normal + modifiers.price.ati}
    };
    item.type       = 'bundle';
    // the weight of the bundle is 0 -> we need to calculate the total weight with each products
    // the weight of the bundle isn't 0 -> the admin put the weight so we use it
    if (item.weight === 0) {
        item.weight = await calculateWeight(item);
    }
    // we change the weight with modifiers
    item.weight    += modifiers.weight;
    const finalItem = await rebuildSelectionProducts(item, lang);
    const _cart     = await this.basicAddToCart(cart, finalItem, user, lang);
    return _cart;
};

async function calculateWeight(item) {
    if (item) {
        let weight = 0;
        if (item.selections) {
            for (const oneProductOfSelections of item.selections) {
                if (oneProductOfSelections.products) {
                    for (const oneProductID of oneProductOfSelections.products) {
                        const product = await mongoose.model('products').findOne({_id: oneProductID});
                        if (product.weight) {
                            weight += product.weight;
                        }
                    }
                }
            }
        }
        return weight;
    }
    return 0;
}

ProductBundleSchema.methods.getBundlePrdsModifiers = async function (selections) {
    const modifiers     = {price: {ati: 0, et: 0}, weight: 0};
    const itemPrdBundle = await this.model('products').findOne({_id: this._id});
    if (itemPrdBundle && selections && selections.length) {
        for (const selection of selections) {
            const itemPrdBundleSection = itemPrdBundle.bundle_sections.find((bundle_section) => bundle_section.ref === selection.bundle_section_ref);
            for (const product of selection.products) {
                const itemPrdBundleSectionProduct = itemPrdBundleSection.products.find((itemPrdBundleSectionPrd) => itemPrdBundleSectionPrd.id.toString() === product);
                if (itemPrdBundleSectionProduct && itemPrdBundleSectionProduct.modifier_price && itemPrdBundleSectionProduct.modifier_price.et && itemPrdBundleSectionProduct.modifier_price.ati) {
                    modifiers.price.et  += itemPrdBundleSectionProduct.modifier_price.et;
                    modifiers.price.ati += itemPrdBundleSectionProduct.modifier_price.ati;
                }
                if (itemPrdBundleSectionProduct && itemPrdBundleSectionProduct.modifier_weight) {
                    modifiers.weight += itemPrdBundleSectionProduct.modifier_weight;
                }
            }
        }
    }
    return modifiers;
};

function validateBySection(bundle_section, item) {
    const selection = item.selections.find(function (selection) {
        return selection.bundle_section_ref === bundle_section.ref;
    });

    // Si le client n'a sélectionné aucune des éléments d'une section, on vérifie si cette section était requise
    if (!selection) {
        return !bundle_section.isRequired;
    }

    if (!selection.products || selection.products.length === 0) {
        return false;
    }

    switch (bundle_section.type) {
    case 'SINGLE':
    case 'VIRTUAL':
        // On vérifie que le client n'a sélectionné qu'un produit et que ce produit est dans la liste des choix
        return selection.products.length === 1 && bundle_section.products.find(function (product) {
            return product.id.toString() === selection.products[0];
        }) !== undefined;
    case 'MULTIPLE':
        // On vérifie que le nombre de sélections est dans la fourchette du nombre de sélections possibles
        if (bundle_section.minSelect && selection.products.length < bundle_section.minSelect) {
            return false;
        }

        if (bundle_section.maxSelect && selection.products.length > bundle_section.maxSelect) {
            return false;
        }

        // On vérifie que les produits sélectionnés sont dans la liste des choix
        let i = 0;
        while (i < selection.products.length && bundle_section.products.find(function (product) {
            return product.id.toString() === selection.products[i];
        }) !== undefined) {
            i++;
        }

        return i === selection.products.length;
    default:
        break;
    }
}

async function rebuildSelectionProducts(item, lang) {
    // on boucle sur les selections
    for (let i = 0; i < item.selections.length; i++) {
        // on boucle les produits de la selection
        for (let j = 0; j < item.selections[i].products.length; j++) {
            const prd                      = await require('../../services/products').getProduct({filter: {_id: item.selections[i].products[j]}, structure: {code: 1, translation: 1, images: 1}});
            item.selections[i].products[j] = {
                id           : prd._id,
                name         : prd.translation[lang].name,
                code         : prd.code,
                image        : require('../../utils/medias').getProductImageUrl(prd),
                description1 : prd.translation[lang].description1,
                description2 : prd.translation[lang].description2,
                canonical    : prd.translation[lang].canonical,
                type         : prd.type
            };
        }
    }
    return item;
}

aquilaEvents.emit('productBundleSchemaInit', ProductBundleSchema);

module.exports = ProductBundleSchema;