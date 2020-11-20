const mongoose = require('mongoose');
const helper   = require('../../utils/utils');
const Schema   = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const NSErrors = require('../../utils/errors/NSErrors');

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
}, {discriminatorKey: 'kind'});

// LATER, calsulate qty and disponibility from child products on retrieving product
/* ProductBundleSchema.virtual("stock").get(function () {
    return this.stock.qty - this.stock.qty_booked;
}); */

ProductBundleSchema.methods.updateData = async function (data, cb) {
    const updatedData           = data;
    updatedData.price.priceSort = updatedData.price.et.special === undefined || updatedData.price.et.special === null ? updatedData.price.et.normal : updatedData.price.et.special;
    if (updatedData.autoSlug) {
        // On met à jour le slug du produit
        updatedData._slug = `${helper.slugify(updatedData.name)}-${updatedData.id}`;
    }
    try {
        const updPrd = await this.model('BundleProduct').findOneAndUpdate({_id: this._id}, {$set: updatedData}, {new: true});
        return cb(null, updPrd);
    } catch (err) {
        return cb(err);
    }
};

ProductBundleSchema.methods.addToCart = async function (cart, item) {
    if (!item.selections) {
        throw NSErrors.ProductInvalid;
    }
    // Il ne faut pas pouvoir ajouter des produits qui ne sont reliés à aucune section
    item.selections = item.selections.filter((selection) => this.bundle_sections.find((section) => selection.bundle_section_ref === section.ref) !== undefined);
    // TODO P2: On ne peut pas avoir deux sections avec la même référence
    // On valide les produits qui sont reliés à des sections
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
    if (global.envConfig.stockOrder.bookingStock === 'panier') {
        for (let i = 0; i < item.selections.length; i++) {
            const selectionProducts = item.selections[i].products;
            // on check que chaque produit soit commandable
            for (let j = 0; j < selectionProducts.length; j++) {
                const ServicesProducts = require('../../services/products');
                // const selectionProduct = await this.model('products').findById(selectionProducts[j]);
                if (selectionProducts[j].type === 'simple') {
                    if (!ServicesProducts.checkProductOrderable(selectionProducts[j], item.quantity).ordering.orderable || !ServicesProducts.checkProductOrderable(item.stock, null)) throw NSErrors.ProductNotOrderable;
                    await ServicesProducts.updateStock(selectionProducts[j], -item.quantity);
                }
            }
        }
    }
    const modifiers = await this.getBundlePrdsModifiers(item.selections);
    item.price      = {
        // TODO P3 : se baser sur le produit normal pour ce schémas - Request somewhere later
        vat  : {rate: this.price.tax},
        unit : {et: this.price.et.normal += modifiers.price.et, ati: this.price.ati.normal += modifiers.price.ati}
    };
    item.type       = 'bundle';
    item.weight    += modifiers.weight;
    const _cart     = await this.basicAddToCart(cart, item);
    return _cart;
};

ProductBundleSchema.methods.getBundlePrdsModifiers = async function (selections) {
    const modifiers     = {price: {ati: 0, et: 0}, weight: 0};
    const itemPrdBundle = await this.model('products').findOne({_id: this._id});
    if (itemPrdBundle && selections && selections.length) {
        for (const selection of selections) {
            const itemPrdBundleSection = itemPrdBundle.bundle_sections.find((bundle_section) => bundle_section.ref);
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
    console.log('Total modifiers: ', modifiers);
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
            return product.id === selection.products[i];
        }) !== undefined) {
            i++;
        }

        return i === selection.products.length;
    case 'VIRTUAL':
        // On vérifie que le client n'a sélectionné qu'un produit et que ce produit est dans la liste des choix
        return selection.products.length === 1 && bundle_section.products.find(function (product) {
            return product.id.toString() === selection.products[0];
        }) !== undefined;
    default:
        break;
    }
}

module.exports = ProductBundleSchema;