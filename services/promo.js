/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {cloneDeep}     = require('lodash');
const mongoose        = require('mongoose');
const {populateItems} = require('aql-utils');
const {
    Promo,
    Rules,
    Languages,
    ProductSimple,
    Cart
}                     = require('../orm/models');
const ServiceRules    = require('./rules');
const QueryBuilder    = require('../utils/QueryBuilder');
const promoUtils      = require('../utils/promo');
const NSErrors        = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Promo, restrictedFields, defaultFields);

const getPromos = async (PostBody) => queryBuilder.find(PostBody);

const getPromo = async (PostBody) => queryBuilder.findOne(PostBody);

const getPromoById = async (id, PostBody = null) => queryBuilder.findById(id, PostBody);

const setPromo = async (body, _id = null) => {
    let result;
    if ( body.dateStart && body.dateEnd && (new Date(body.dateStart).getTime() >= new Date(body.dateEnd).getTime())) {
        throw NSErrors.PromoDateError;
    }
    const codePromoUnique = await isUniqueCodePromo(body);
    // If there are gifts in the promo then the discount type (M for amount and P for percentage) goes to null
    if (body.gifts && body.gifts.length) body.discountType = null;
    if (_id) {
        // Update
        if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
        if (!codePromoUnique) throw NSErrors.PromoCodePromoExists;
        result = await Promo.findByIdAndUpdate(_id, {$set: body}, {new: true, runValidators: true});
        if (!result) throw NSErrors.PromoUpdateError;
    } else {
        if (!codePromoUnique) throw NSErrors.PromoCodePromoExists;
        // Create
        result = await Promo.create(body);
    }
    return result;
};

const clonePromo = async (_id) => {
    // Cloner le discount
    const promoInit = await queryBuilder.findById(_id);
    promoInit.codes = [];
    let promoCloned = JSON.parse(JSON.stringify(promoInit));
    delete promoCloned._id;
    promoCloned.name     += ' (cloned)';
    promoCloned.actif     = false;
    promoCloned.createdAt = new Date().toISOString();
    promoCloned.updatedAt = new Date().toISOString();
    // TODO : clone of the ".gifts"
    promoCloned = await Promo.create(promoCloned);

    // Clone the rule
    const ruleCloneInit = await Rules.findOne({owner_id: _id});
    if (ruleCloneInit !== null) {
        let ruleCloned = JSON.parse(JSON.stringify(ruleCloneInit));
        delete ruleCloned._id;
        deleteAll_id(ruleCloned);
        ruleCloned.owner_id  = promoCloned._id;
        ruleCloned           = await Rules.create(ruleCloned);
        promoCloned.rules_id = ruleCloned._id;
    }

    // Clone actions
    const actionsInit   = await Rules.find({owner_id: _id, owner_type: 'discountAction'});
    promoCloned.actions = [];
    for (let iAction = 0; iAction < actionsInit.length; iAction++) {
        const oneAction       = actionsInit[iAction];
        let actionCloned      = JSON.parse(JSON.stringify(oneAction));
        actionCloned.owner_id = promoCloned._id;
        delete actionCloned._id;
        deleteAll_id(actionCloned);
        actionCloned = await Rules.create(actionCloned);
        promoCloned.actions.push(actionCloned._id);
    }

    promoCloned.save();
    return promoCloned._id;
};

function deleteAll_id(rule) {
    remove_idFromList(rule.effects);
    remove_idFromList(rule.conditions);
    remove_idFromList(rule.other_rules, true);
    for (let iOtherRules = 0; iOtherRules < rule.other_rules.length; iOtherRules++) {
        const oneOtherRule = rule.other_rules[iOtherRules];
        deleteAll_id(oneOtherRule);
    }
}

function remove_idFromList(list_obj, is_other_rules) {
    for (let iObj = 0; iObj < list_obj.length; iObj++) {
        const element = list_obj[iObj];
        delete element._id;

        if (is_other_rules) { // these two fields are mandatory (mongoose), while they were created without...
            element.owner_type = 'discount';
            element.owner_id   = mongoose.Types.ObjectId('000000000000000000000000');
        }
    }
}

const deletePromoById = async (_id) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
    const doc = await Promo.findOneAndRemove({_id});
    if (!doc) throw NSErrors.PromoNotFound;
    const rule = await ServiceRules.queryRule({filter: {owner_id: _id}});
    if (rule) {
        await ServiceRules.deleteRule(rule._id);
    }
    return doc;
};

const deletePromoCodeById = async (promoId, codeId) => {
    if (!mongoose.Types.ObjectId.isValid(promoId)) throw NSErrors.InvalidObjectIdError;
    if (!mongoose.Types.ObjectId.isValid(codeId)) throw NSErrors.InvalidObjectIdError;
    const doc = await Promo.findOne({_id: promoId});
    if (!doc) throw NSErrors.PromoNotFound;
    try {
        return Promo.updateOne({_id: promoId}, {$pull: {codes: {_id: codeId}}});
    } catch (err) {
        throw NSErrors.PromoCodeNotFound;
    }
};

const checkPromoVariants = async (req, res, datas, populate) => {
    // Just for product variants
    for (let i = 0; i < datas.length; i++) {
        const data = datas[i];
        if (data.variants_values) {
            for (let j = 0; j < data.variants_values.length; j++) {
                const variantsValues           = data.variants_values[j];
                variantsValues.price.priceSort = {
                    et  : variantsValues.price.et.special || variantsValues.price.et.normal,
                    ati : variantsValues.price.ati.special || variantsValues.price.ati.normal
                };

                const resVariantValues  = await checkPromoCatalog([variantsValues], req.info, req.body.lang, false, populate, false, res.keepPromos);
                data.variants_values[j] = resVariantValues[0];
                if (data.variants_values[j].default) {
                    data.price = data.variants_values[j].price;
                }
            }
        }
        datas[i] = data;
    }
};

const middlewarePromoCatalog = async (req, res) => {
    try {
        if (res.locals) {
            const populate = req.body.PostBody && req.body.PostBody.populate ? req.body.PostBody.populate : [];
            if (res.locals.datas) {
                const datas = await checkPromoCatalog(res.locals.datas, req.info, req.body.lang, false, populate, res.keepPromos);
                await checkPromoVariants(req, res, datas, populate);

                if (res.keepPromos) {
                    return {...res.locals, datas: datas.products, promos: datas.promos};
                }
                return {...res.locals, datas};
            }

            const datas = await checkPromoCatalog([res.locals], req.info, req.body.lang, false, populate, false, res.keepPromos);
            await checkPromoVariants(req, res, datas, populate);

            if (res.keepPromos) {
                return {datas};
            }
            return datas[0];
        }

        return [];
    } catch (error) {
        return console.error(error);
    }
};

/**
 * Function to apply catalog promotions
 * @param {mongoose.Document[]} products list of products
 * @param {User|null} [user=null]
 * @param {string|null} [lang=null]
 * @param {boolean} [keepObject=false]
 * @param {string[]} [populate=[]]
 * @param {boolean} [associatedProducts=false]
 * @param {boolean} [keepPromos=false]
 */
const checkPromoCatalog = async (products, user = null, lang = null, keepObject = false, populate = [], associatedProducts = false, keepPromos = false) => {
    // TODO : improve speed because it's usefull
    if (!products || !products.length) return [];
    const returnedPromos = [];
    const currentDate    = new Date(Date.now());
    const promos         = await Promo.find(
        {
            $or : [
                {$and: [{dateStart: null}, {dateEnd: null}]},
                {$and: [{dateStart: null}, {dateEnd: {$gt: currentDate}}]},
                {$and: [{dateStart: {$lt: currentDate}}, {dateEnd: null}]},
                {$and: [{dateStart: {$lt: currentDate}}, {dateEnd: {$gt: currentDate}}]}
            ],
            actif : true,
            type  : '2'
        },
        null,
        {sort: {priority: -1}}
    ).populate('rules_id').lean();
    if (!promos.length) {
        // There are currently no catalog promotions
        return products;
    }
    // Add a tomporary field to each product, this array will contain
    // objects of type {discountValue: 10, discountType: "P"}
    // discount is the value of the discount and the discountType is the way
    // in which the discount will be applied (in percentage for "P" or by subtracting for "M")
    for (let i = 0; i < products.length; i++) {
        if (!products[i]) continue; // If a product is null or undefined
        if (products[i]._doc) products[i] = products[i].toObject();
        if (products[i].type && products[i].type === 'bundle') continue;
        products[i].relevantDiscount = [];

        // For each current promotion we must check that the products entered in the parameters are eligible for the discount
        for (let j = 0; j < promos.length; j++) {
            const promo = promos[j];
            if (!promo.rules_id) {
                returnedPromos.push(promo);
                products[i].relevantDiscount.push(promo);
            } else {
                const tCondition  = await ServiceRules.applyRecursiveRulesDiscount(promo.rules_id, user, {items: [products[i]]});
                const ifStatement = promoUtils.createIfStatement(tCondition);
                try {
                    // We test if the eval can return an error
                    eval(ifStatement);
                } catch (error) {
                    throw NSErrors.PromoCodeIfStatementBadFormat;
                }
                // If the user cannot use this code we return an error
                if (eval(ifStatement)) {
                    returnedPromos.push(promo);
                    products[i].relevantDiscount.push(promo);
                    if (!promo.applyNextRules) continue;
                }
            }
        }

        // we need to take only the discount who have the highest priority
        if (products[i].relevantDiscount && products[i].relevantDiscount.length) {
            const foundPriority          = products[i].relevantDiscount.map((p) => p.priority).sort((a, b) => b - a)[0];
            products[i].relevantDiscount = products[i].relevantDiscount.filter((d) => d.priority === foundPriority);
        }
        // Once we know which products are ok for the discount, we get the price of each product
        // (normal or special if available) and apply the highest discounts
        // FUTURE: To accumulate the promos or not
        for (let j = 0, lenj = products[i].relevantDiscount.length; j < lenj; j++) {
            const appliedPromoProduct = cloneDeep(products[i]);
            applyRelevantDiscount(appliedPromoProduct, appliedPromoProduct.relevantDiscount[j]);
            if (appliedPromoProduct.price.priceSort.et < products[i].price.priceSort.et || appliedPromoProduct.price.priceSort.ati < products[i].price.priceSort.ati) {
                products[i] = appliedPromoProduct;
            }
        }

        if (!keepObject) {
            products[i].isNew = false;
            if (products[i]._doc && products[i].associated_prds) {
                if (!associatedProducts) {
                    if (products[i].associated_prds.length > 0 && products[i].associated_prds[0]._id === undefined) {
                        populate.push('associated_prds');
                        await products[i].populate(populate).execPopulate();
                    }
                    const prds                  = products[i].associated_prds;
                    products[i].associated_prds = await checkPromoCatalog(prds, user, lang, false, populate, true);
                }
            }
        }
    }
    if (keepPromos) {
        return {products, promos: returnedPromos};
    }
    return products;
};

/**
 * apply best relevant discount for product
 * @param {Product} product
 * @param {Promo} discount
 */
const applyRelevantDiscount = (product, discount) => {
    if (discount.discountType !== null) {
        if (discount.discountType.startsWith('FV')) {
            if (discount.discountType === 'FVet') {
                product.price.et.special  = discount.discountValue;
                product.price.ati.special = (discount.discountValue * (product.price.tax / 100 + 1));
            } else {
                product.price.et.special  = (discount.discountValue / (product.price.tax / 100 + 1));
                product.price.ati.special = discount.discountValue;
            }
        } else {
            const newDiscountPrice    = calculDiscountItem(product, discount);
            product.price.et.special  = newDiscountPrice.discountET;
            product.price.ati.special = newDiscountPrice.discountATI;
        }
    }
    product.price.priceSort = {
        et  : product.price.et.special,
        ati : product.price.ati.special
    };
};

const checkForApplyPromo = async (userInfo, cart, lang = null, codePromo = null) => {
    let oCart;
    try {
        let user = null;
        if (userInfo) {
            if (userInfo.info) {
                user = userInfo.info;
            } else {
                user = userInfo;
            }
        }
        if (
            typeof cart === 'string'
            && mongoose.Types.ObjectId.isValid(cart)
        ) {
            cart = await Cart.findOne({_id: cart}).populate('items.id');

            // Check if products exists in the cart
            const ServiceCart = require('./cart');
            cart              = await ServiceCart.checkCartProductsExist(cart);
        }
        let code;
        if (codePromo) {
            code        = codePromo;
            cart.promos = [];
        }
        await checkQuantityBreakPromo(cart, user, lang);
        if (!code) {
            if (cart.promos && cart.promos.length) {
                code = cart.promos[0].code;
            } else {
                return cart;
            }
        }
        oCart = await checkCodePromoByCode(code, cart._id, user, lang);
    } catch (error) {
        oCart = await Cart.findOneAndUpdate({_id: cart._id, status: 'IN_PROGRESS'}, {$set: {promos: []}}).populate(['items.id']);
    }
    oCart = await oCart.getItemsStock();
    return oCart;
};

/**
 * Check if the items in the cart are eligible for quantity breaks
 * @param {Cart} cart
 * @param {Users} user
 * @param {String} lang
 * @param {Boolean} resetPromoCatalog
 */
const checkQuantityBreakPromo = async (cart, user = null, lang = null, resetPromoCatalog = true) => {
    // TODO : improve speed because it's usefull
    const currentDate        = Date.now();
    const productsPromoIds   = [];
    const bestPromoByProduct = {};

    if (!cart) throw NSErrors.CartInactiveNotFound;
    // Looking for promos of type cart (type: "1") and quantitybreak
    const promos = await Promo.find({discountType: 'QtyB', actif: true, type: '1'}, null, {sort: {priority: -1}}).populate('actions');
    if (!promos || !promos.length) {
        return cart;
    }

    if (resetPromoCatalog) {
        // Reset the special prices and we apply the possible catalog promotions
        const productsCatalog = await checkPromoCatalog(cart.items.map((item) => item.id), user, lang, false);
        for (let i = 0, leni = cart.items.length; i < leni; i++) {
            cart = await applyPromoToCartProducts(productsCatalog, cart, i);
        }
    }

    const copyCart = JSON.parse(JSON.stringify(cart));

    // -----------------------------------------------------------------------------
    // ----------------------- Apply rules for this discount -----------------------
    // -----------------------------------------------------------------------------
    // We need to apply the rules of each discount to know if the user
    // can benefit from a discount depending on what is in the cart

    let applyNextRules = true;
    let promoIndex     = 0;
    const promosLen    = promos.length;
    while (applyNextRules && promoIndex < promosLen) {
        const promo                = promos[promoIndex];
        const {dateStart, dateEnd} = promo;

        // Validation of the quantity break
        if ((dateStart === null || dateStart < currentDate) && (dateEnd === null || dateEnd > currentDate) && promo.actions.length > 0) {
            if (promo.actions.length > 0) {
                await populateItems(copyCart.items);

                for (let i = 0, leni = promo.actions.length; i < leni; i++) {
                    // we test every action on every product
                    let statementResult = false;
                    for (let j = 0, lenj = copyCart.items.length; j < lenj; j++) {
                        const itemId      = copyCart.items[j].id._id;
                        const baseProduct = await ProductSimple.findOne({_id: itemId}).lean();
                        const action      = await ServiceRules.applyRecursiveRulesDiscount(promo.actions[i], user, {items: [copyCart.items[j].id]});

                        try {
                            // We test if the eval can return an error
                            statementResult = eval(promoUtils.createIfStatement(action));
                        } catch (error) {
                            throw NSErrors.PromoCodeIfStatementBadFormat;
                        }

                        if (statementResult) {
                            // if it is true, we apply the actions
                            for (let k = 0, lenk = promo.actions[i].effects.length; k < lenk; k++) {
                                if (copyCart.items[j].quantity >= promo.actions[i].effects[k].qty) {
                                    if (promo.actions[i].effects[k].type.startsWith('FV')) {
                                        let field = 'unit';
                                        if (baseProduct.price.et.special !== undefined) {
                                            field = 'special';
                                        }

                                        if (!bestPromoByProduct[itemId] || bestPromoByProduct[itemId].et < baseProduct.price.et[field === 'unit' ? 'normal' : 'special']) {
                                            if (promo.actions[i].effects[k].type === 'FVet') {
                                                bestPromoByProduct[itemId] = {
                                                    et  : baseProduct.price.et[field === 'unit' ? 'normal' : 'special'] - promo.actions[i].effects[k].value,
                                                    ati : baseProduct.price.ati[field === 'unit' ? 'normal' : 'special'] - (promo.actions[i].effects[k].value * (baseProduct.price.tax / 100 + 1))
                                                };
                                            } else {
                                                bestPromoByProduct[itemId] = {
                                                    et  : baseProduct.price.et[field === 'unit' ? 'normal' : 'special'] - (promo.actions[i].effects[k].value / (baseProduct.price.tax / 100 + 1)),
                                                    ati : baseProduct.price.ati[field === 'unit' ? 'normal' : 'special'] - promo.actions[i].effects[k].value
                                                };
                                            }

                                            if (productsPromoIds.includes(itemId) === false) {
                                                productsPromoIds.push(itemId);
                                            }
                                        }
                                    } else {
                                        const _discount = await calculCartDiscountItem(copyCart.items[j], {discountType: promo.actions[i].effects[k].type, discountValue: promo.actions[i].effects[k].value});

                                        if (!bestPromoByProduct[itemId] || bestPromoByProduct[itemId].et < _discount.discountET) {
                                            bestPromoByProduct[itemId] = {et: _discount.discountET, ati: _discount.discountATI};

                                            if (productsPromoIds.includes(itemId) === false) {
                                                productsPromoIds.push(itemId);
                                            }
                                        }
                                    }
                                } else {
                                    cart = await resetCartProductPrice(cart, j);
                                }
                            }
                        }
                    }
                }
            }
        }
        applyNextRules = promo.applyNextRules;
        promoIndex++;
    }

    if (productsPromoIds.length === 0) {
        return cart.save();
    }

    for (let i = 0, leni = productsPromoIds.length; i < leni; i++) {
        const prdIndex    = copyCart.items.findIndex((_prd) => _prd.id._id.toString() === productsPromoIds[i]);
        const baseProduct = await ProductSimple.findOne({code: copyCart.items[prdIndex].code}).lean();

        if (prdIndex > -1) {
            let field = 'unit';
            if (baseProduct.price.ati.special || baseProduct.price.et.special) {
                field = 'special';
            }
            cart.set(`items.${prdIndex}.price.special`, {
                et  : baseProduct.price.et[field === 'unit' ? 'normal' : 'special'] - bestPromoByProduct[productsPromoIds[i]].et,
                ati : baseProduct.price.ati[field === 'unit' ? 'normal' : 'special'] - bestPromoByProduct[productsPromoIds[i]].ati
            });
        }
    }
    cart = await cart.getItemsStock();

    return cart.save();
};

/**
 * Check if a basket code is valid
 * @param {*} code
 * @param {*} idCart
 * @param {*} user
 * @param {*} lang
 */
const checkCodePromoByCode = async (code, idCart, user = null, lang = null) => {
    // -----------------------------------------------------------------------------
    // ---- Recovery of the data and check of the validity of the discount code ----
    // -----------------------------------------------------------------------------
    const cart = await Cart.findById({_id: idCart}).populate('items.id');
    if (!cart) throw NSErrors.CartInactiveNotFound;
    // We search if a promo code corresponding to 'code' exists, is active and is of type basket (type: "1")
    const promo = await Promo.findOne({'codes.code': {$regex: code, $options: 'i'}, actif: true, type: '1'});
    if (!promo) {
        // The entered promo code is wrong so we delete the old promo code
        await removePromoFromCart(cart);
        throw NSErrors.PromoNotFound;
    }
    const currentDate          = Date.now();
    const {dateStart, dateEnd} = promo;
    // Check the date of use of the promo code. If it's not between the dateStart and dateEnd,
    // then we remove the promo code from the card

    if ((dateStart && dateStart > currentDate) || (dateEnd && dateEnd < currentDate) ) {
        await removePromoFromCart(cart);
        throw NSErrors.PromoCodePromoInvalid;
    }

    const newCode = promo.codes.filter((codeFound) => (code).toLowerCase() === (codeFound.code).toLowerCase());
    // Check if the total number of times the code has been used is lower than the limit of times the code is usable
    if (newCode[0].limit_total !== null && (newCode[0].used >= newCode[0].limit_total)) {
        await removePromoFromCart(cart);
        throw NSErrors.PromoCodePromoInvalid;
    }
    // We look for the number of orders the customer has placed with a promo code,
    // if the number of orders with this code is >= the promo.codes.limit_client (The number of times a customer can use this code)
    // then he won't be able to use the promo code again
    if (newCode[0].limit_client !== null && newCode[0].client_used >= newCode[0].limit_client) {
        await removePromoFromCart(cart);
        throw NSErrors.PromoCodePromoLimitClientMax;
    }
    // -----------------------------------------------------------------------------
    // ----------------------- Apply rules of this discount ------------------------
    // -----------------------------------------------------------------------------
    // We need to apply the rules of this discount to know if the user
    // can use this promo code depending on what is in the cart
    if (promo.rules_id) {
        const promoRules = await promo.populate('rules_id').execPopulate();
        if (promoRules.rules_id.conditions.length > 0 || promoRules.rules_id.other_rules.length > 0) {
            const tCondition  = await ServiceRules.applyRecursiveRulesDiscount(promoRules.rules_id, user, cart);
            const ifStatement = promoUtils.createIfStatement(tCondition);
            try {
                // We test if the eval can return an error
                eval(ifStatement);
            } catch (error) {
                throw NSErrors.PromoCodeIfStatementBadFormat;
            }
            // If the user cannot use this code we return an error
            if (!eval(ifStatement)) {
                await removePromoFromCart(cart);
                throw NSErrors.PromoCodePromoNotAuthorized;
            }
            // }
        }
    }

    // At the moment the user can enter only one promo code, so we force the promos to be an array of one element
    cart.promos = [{
        promoId     : promo._id,
        discountATI : null,
        discountET  : null,
        code,
        name        : promo.name,
        description : promo.description,
        promoCodeId : newCode[0]._id,
        gifts       : [],
        productsId  : []
    }];
    // The shopping cart promotion entitles you to a discount or free gifts
    if (promo.gifts.length) {
        // Get the default language
        if (!lang) {
            const language = await Languages.findOne({defaultLanguage: true});
            lang           = language.code;
        }
        const promoWithGiftsPopulated = await promo.populate('gifts').execPopulate();
        // We add the products to the gifts of the cart
        promoWithGiftsPopulated.gifts.forEach((gift) => {
            const {_id, translation, attributes} = gift;
            const price                          = {unit: {ati: 0, et: 0}, vat: {rate: gift.price.tax}};
            cart.promos[0].gifts.push({id: _id, name: translation[lang].name, price, quantity: 1, atts: attributes, opts: []});
        });
    } else {
        // The user can use this code, so we must register the promo code in his cart
        const {discountATI, discountET} = await calculCartDiscount(cart, promo);
        if (discountATI !== null) {
            cart.promos[0].discountATI = discountATI;
        }
        if (discountET !== null) {
            cart.promos[0].discountET = discountET;
        }
    }
    let resultCart = await cart.save();
    resultCart     = await resultCart.getItemsStock();
    return resultCart;
};

async function removePromoFromCart(cart) {
    cart.promos = [];
    return cart.save();
}
/**
 * Function to check that a code is unique in promotional documents
 * @param {*} promo: Object
 */
async function isUniqueCodePromo(promo) {
    if (!promo.codes || !promo.codes.length) return true;
    const tCodes = [];
    let nbFound  = 0;
    for (let i = 0; i < promo.codes.length; i++) {
        tCodes.push(Promo.findOne({'codes.code': promo.codes[i].code, _id: {$ne: promo._id}}));
    }
    try {
        const resultPromo = await Promise.all(tCodes);
        resultPromo.forEach((resPromo) => !resPromo || nbFound++);
    } catch (error) {
        console.error(error);
    }
    return !nbFound;
}

/**
 * Allows you to calculate the promotion of a product
 * @param {*} prd
 * @param {*} promo
 */
function calculDiscountItem(prd, promo) {
    // We calculate the total with discount of the basket
    let values                          = {discountATI: 0, discountET: 0};
    const {discountType, discountValue} = promo;

    // If the discountType is percentage
    if (prd && prd.price && discountType === 'P') {
        // We calculate the discount to apply on the product, if discount > the price of the item then we
        // apply a discount equal to the price of the item in order not to have a negative price, so we will have a price = 0
        values = calculateCartItemDiscount(prd.price.priceSort, prd.price.priceSort.et > 0 ? prd.price.priceSort.et * (discountValue / 100) : undefined, prd.price.priceSort.ati > 0 ? prd.price.priceSort.ati * (discountValue / 100) : undefined);
    } else if (prd && prd.price && discountType === 'Aet') {
        values = calculateCartItemDiscount(prd.price.priceSort, discountValue, undefined);
    } else if (prd && prd.price && discountType === 'Aati') {
        values = calculateCartItemDiscount(prd.price.priceSort, undefined, discountValue);
    } else if (prd && prd.price && discountType === null) {
        values = {discountET: 0, discountATI: 0};
    }

    return values;
}

/**
 * Allows you to calculate the discount on an item in the basket
 * @param {*} item item of the cart that will have the promo
 * @param {*} promo
 */
async function calculCartDiscountItem(item, promo) {
    // We calculate the total with discount of the basket
    let values                          = {discountATI: 0, discountET: 0};
    const {discountType, discountValue} = promo;
    const baseProduct                   = await ProductSimple.findOne({code: item.code}).lean();

    // If the discountType is percentage
    if (discountType === 'P') {
        // We calculate the discount to apply on the product, if discount > the price of the item then we
        // apply a discount equal to the price of the item in order not to have a negative price, so we will have a price = 0
        values = calculateCartItemDiscount(baseProduct.price.priceSort, baseProduct.price.priceSort.et * (discountValue / 100));
    } else if (discountType === 'Aet') {
        values = calculateCartItemDiscount(baseProduct.price.priceSort, discountValue);
    } else if (discountType === 'Aati') {
        values = calculateCartItemDiscount(baseProduct.price.priceSort, undefined, discountValue);
    }

    return {
        ...values,
        basePriceATI : baseProduct.price.priceSort.ati,
        basePriceET  : baseProduct.price.priceSort.et
    };
}

/**
 * Allows to calculate the total of the cart with discount, this total should be added to cart.promos[0].priceATI
 * @param {Cart} cart
 * @param {Promo} promo
 //* @param {Boolean} isQuantityBreak allows to calculate the cart.priceTotal without taking into account the cart.quantityBreaks
 */
async function calculCartDiscount(cart, promo = null/* , isQuantityBreak = false */) {
    if (!promo) return null;
    // We calculate the total with discount of the basket
    let values                          = {discountATI: 0, discountET: 0};
    const {discountType, discountValue} = promo;
    const priceTotal                    = await calculateCartTotal(cart);
    // if (isQuantityBreak) {
    //     priceTotal = cart.calculateBasicTotal();
    // } else {
    //     priceTotal = cart.priceTotal;
    // }
    // priceTotal = await calculateCartTotal(cart);
    // The total price is calculated before the application of promo codes and before the application of quantityBreaks
    // If the discountType is a percentage
    if (discountType === 'P') {
        // If the price ATI/ET is lower than the discount then we put a discount corresponding to the price of the total cart
        // in order to have priceTotal - discountATI (or discountET) = 0
        values = calculateCartItemDiscount(
            priceTotal,
            priceTotal.et * (discountValue / 100)
        );
    } else if (discountType === 'Aet') {
        // the discountType is an amount
        // if the price including ATI/HT is lower than the discount then we put a discount corresponding to the price of the cart
        // in order to have priceTotal - discountATI (or discountET) = 0
        values = calculateCartItemDiscount(priceTotal, discountValue);
    } else if (discountType === 'Aati') {
        values = calculateCartItemDiscount(priceTotal, undefined, discountValue);
    }
    return {
        discountET  : priceTotal.et - values.discountET,
        discountATI : priceTotal.ati - values.discountATI
    };
}

const applyPromoToCartProducts = async (productsCatalog, cart, cartPrdIndex) => {
    const prdIndex = productsCatalog.findIndex((_prd) => {
        const idProduct = cart.items[cartPrdIndex].id._id ? cart.items[cartPrdIndex].id._id : cart.items[cartPrdIndex].id;
        return _prd._id && ((_prd._id).toString() === idProduct.toString());
    });
    if (prdIndex > -1) {
        if (!cart.items[cartPrdIndex].noRecalculatePrice) {
            cart.items[cartPrdIndex].price.unit = {
                et  : productsCatalog[prdIndex].price.et.normal,
                ati : productsCatalog[prdIndex].price.ati.normal
            };
            if (productsCatalog[prdIndex].price.et.special !== undefined) {
                cart.items[cartPrdIndex].price.special      = {
                    et  : productsCatalog[prdIndex].price.et.special,
                    ati : productsCatalog[prdIndex].price.ati.special
                };
                cart.items[cartPrdIndex].noRecalculatePrice = true;
            } else if (cart.items[cartPrdIndex].price.special) {
                await cart.set(`items.${cartPrdIndex}.price.special`, undefined);
            }
        }
    }
    cart = await cart.getItemsStock();
    return cart;
};

/**
 *
 * @param {*} prices
 * @param {*} discountValueET
 * @param {*} discountValueATI
 * @return {Array} array[0] => discountET - array[1] => discountATI
 */
function calculateCartItemDiscount(prices, discountValueET, discountValueATI) {
    let discountET  = 0;
    let discountATI = 0;
    const rate      = prices.et === 0 ? 1 :  Number((prices.ati / prices.et).aqlRound(5));

    if (discountValueET) {
        discountET  = prices.et - discountValueET;
        discountET  = discountET <= 0 ? 0 : discountET;
        discountATI = discountET * rate;
    } else if (discountValueATI) {
        discountATI = prices.ati - discountValueATI;
        discountATI = discountATI <= 0 ? 0 : discountATI;
        discountET  = discountATI / rate;
    }

    return {
        discountET  : Number(discountET.aqlRound(2)),
        discountATI : Number(discountATI.aqlRound(2))
    };
}

async function resetCartProductPrice(cart, j) {
    if (cart.items[j].noRecalculatePrice || cart.items[j].type === 'bundle') {
        return cart;
    }
    // we recover the product in base and we reapply its value (price)
    const baseProduct        = await ProductSimple.findOne({code: cart.items[j].code}).lean();
    cart.items[j].price.unit = {et: baseProduct.price.et.normal, ati: baseProduct.price.ati.normal};
    if (baseProduct.price.et.special || baseProduct.price.ati.special) {
        // we set the special price ET if there is one
        if (baseProduct.price.et.special) {
            cart.items[j].price.special = {et: baseProduct.price.et.special};
        }
        // we set the special ATI prize if there is one and if the ET prize has not been previously added
        if (baseProduct.price.ati.special && !cart.items[j].price.special) {
            cart.items[j].price.special = {ati: baseProduct.price.ati.special};
        }
        // we set the special ATI price if there is one and if the ET price has been previously added
        if (baseProduct.price.ati.special && cart.items[j].price.special) {
            cart.items[j].price.special.ati = baseProduct.price.ati.special;
        }
    } else {
        cart.items[j].price.special = undefined;
    }
    cart = await cart.getItemsStock();
    return cart;
}

async function calculateCartTotal(cart) {
    const total = {ati: 0, et: 0};
    for (let i = 0; i < cart.items.length; i++) {
        const item = cart.items[i];
        total.ati += (item.price.special && item.price.special.ati ? item.price.special.ati : item.price.unit.ati) * item.quantity;
        total.et  += (item.price.special && item.price.special.et ? item.price.special.et : item.price.unit.et) * item.quantity;
    }
    return total;
}

module.exports = {
    getPromos,
    getPromo,
    getPromoById,
    setPromo,
    clonePromo,
    deletePromoById,
    deletePromoCodeById,
    middlewarePromoCatalog,
    checkPromoCatalog,
    checkForApplyPromo,
    checkQuantityBreakPromo,
    checkCodePromoByCode,
    applyPromoToCartProducts
};
