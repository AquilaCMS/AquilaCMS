const {cloneDeep}          = require('lodash');
const mongoose             = require('mongoose');
const {
    Promo,
    Rules,
    Languages,
    Products,
    ProductSimple,
    Orders,
    Cart
}                          = require('../orm/models');
const ServiceRules         = require('./rules');
const {getUserFromRequest} = require('../middleware/server');
const QueryBuilder         = require('../utils/QueryBuilder');
const promoUtils           = require('../utils/promo.js');
const NSErrors             = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Promo, restrictedFields, defaultFields);

const getPromos = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const getPromo = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const getPromoById = async (id, PostBody = null) => {
    return queryBuilder.findById(id, PostBody);
};

const setPromo = async (body, _id = null) => {
    let result;
    if ( body.dateStart && body.dateEnd && (new Date(body.dateStart).getTime() >= new Date(body.dateEnd).getTime())) {
        throw NSErrors.PromoDateError;
    }
    const codePromoUnique = await isUniqueCodePromo(body);
    // Si il existe des gifts dans la promo alors le discount type (M pour montant et P pour pourcentage) passe a null
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
        body.discountValue = null;
        result             = await Promo.create(body);
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
    // TODO P5 (chaud) : clone des ".gifts"
    promoCloned = await Promo.create(promoCloned);

    // Cloner la regle
    const ruleCloneInit = await Rules.findOne({owner_id: _id});
    if (ruleCloneInit !== null) {
        let ruleCloned = JSON.parse(JSON.stringify(ruleCloneInit));
        delete ruleCloned._id;
        deleteAll_id(ruleCloned);
        ruleCloned.owner_id  = promoCloned._id;
        ruleCloned           = await Rules.create(ruleCloned);
        promoCloned.rules_id = ruleCloned._id;
    }

    // Cloner les actions
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

        if (is_other_rules) { // ces deux champs sont obligatoire (mongoose), alors qu'ils ont été créé sans...
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

const middlewarePromoCatalog = async (req, res) => {
    try {
        const user = getUserFromRequest(req);

        if (res.locals) {
            const populate = req.body.PostBody && req.body.PostBody.populate ? req.body.PostBody.populate : [];
            if (res.locals.datas) {
                const datas = await checkPromoCatalog(res.locals.datas, user, req.body.lang, false, populate, res.keepPromos);
                if (res.keepPromos) {
                    return {...res.locals, datas: datas.products, promos: datas.promos};
                }
                return {...res.locals, datas};
            }

            const datas = await checkPromoCatalog([res.locals], user, req.body.lang, false, populate, false, res.keepPromos);
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
 * Fonction permettant d'appliquer des promotions catalogues
 * @param {Product} products list of products
 * @param {User|null} [user=null]
 * @param {string|null} [lang=null]
 * @param {boolean} [keepObject=false]
 * @param {string[]} [populate=[]]
 * @param {boolean} [associatedProducts=false]
 * @param {boolean} [keepPromos=false]
 */
const checkPromoCatalog = async (products, user = null, lang = null, keepObject = false, populate = [], associatedProducts = false, keepPromos = false) => {
    // TODO : improve speed because it's usefull
    if ((!products || !products.length) && (!products || !products.items || !products.items.length)) return [];
    // si c'est products.items c'est qu'un panier a été passé, on restucture le tableau
    if ((!products || !products.length) && (products.items  || products.items.length)) {
        products =  products.map((product) => {
            if (product.type === 'bundle') {
                return {
                    ...product.id,
                    price : {
                        ...product.id.price,
                        ati : {
                            normal  : product.price.unit.ati,
                            special : product.price.special ? product.price.special.ati : undefined
                        },
                        et : {
                            normal  : product.price.unit.et,
                            special : product.price.special ? product.price.special.et : undefined
                        }

                    }
                };
            }
            return product.id;
        });
    }
    // On récupére les promos catalogue en cours (on est après la date de début et avant la date de fin)
    // Ou dont la date de début et de fin est null
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
        }, null,
        {sort: {priority: -1}}
    ).populate('rules_id').lean();
    if (!promos.length) {
        // Il n'y a actuellement aucune promo catalogue
        return products;
    }
    // Nous ajoutons un champ tomporaire a chaque produit, ce tableau contiendra
    // des objets de forme : {discountValue: 10, discountType: "P"}
    // discount est la valeur de la remise et le discountType est la façon
    // dont la remise sera appliqué (en pourcentage pour P ou en soustrayant pour M)
    for (let i = 0; i < products.length; i++) {
        if (products[i]._doc) {
            products[i] = products[i].toObject();
        }
        // Si products[i].id et products[i]._id existe alors c'est un objet produit sinon c'est un object productList (lors du basicAddToCart)
        if (products[i].id && products[i]._id) {
            products[i].id = products[i];
        } else {
            products[i].id = await Products.findOne({_id: products[i]._id ? products[i]._id : products[i].id}).populate(populate);
        }
        if (products[i].id) {
            products[i].relevantDiscount = [];
            if (products[i].price === undefined) {
                products[i].price = {tax: 0, priceSort: {et: 0, ati: 0}, et: {}, ati: {}};
            }
            if (products[i].price.tax === undefined) {
                products[i].price.tax = products[i].id.price.tax;
            }
            if (products[i].price.priceSort === undefined) {
                products[i].price.priceSort = products[i].id.price.priceSort;
            }
            if (products[i].price.et === undefined) {
                products[i].price.et = {};
            }
            if (products[i].price.ati === undefined) {
                products[i].price.ati = {};
            }
            if (products[i].price.et.normal === undefined) {
                products[i].price.et.normal = products[i].id.price.et.normal;
            }
            if (products[i].price.et.special === undefined) {
                products[i].price.et.special = products[i].id.price.et.special;
            }
            if (products[i].price.ati.normal === undefined) {
                products[i].price.ati.normal = products[i].id.price.ati.normal;
            }
            if (products[i].price.ati.special === undefined) {
                products[i].price.ati.special = products[i].id.price.ati.special;
            }
        } else {
            // On stoppe s'il y a un soucis avec un produit
            return null;
        }

        // Pour chaque promo en cours nous devons verifier que les produits entrées en parametres soient éligibles a la réduction
        for (let j = 0; j < promos.length; j++) {
            const promo = promos[j];
            if (!promo.rules_id) {
                returnedPromos.push(promo);
                products[i].relevantDiscount.push(promo);
            } else {
                const tCondition  = await ServiceRules.applyRecursiveRulesDiscount(promo.rules_id, user, {items: [products[i]]});
                const ifStatement = promoUtils.createIfStatement(tCondition);
                try {
                    // On test si l'eval peut renvoyer une erreur
                    eval(ifStatement);
                } catch (error) {
                    throw NSErrors.PromoCodeIfStatementBadFormat;
                }
                // Si l'utilisateur ne peut pas utiliser ce code nous renvoyons une erreur
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

        // Une fois que nous savons quelles produits sont eligibles a la réduction, Nous récupérons le prix de chaque produit
        // (normal ou special si existe) et appliquons les reductions les plus fortes
        const product      = products[i];
        const savedProduct = cloneDeep(products[i]);
        // FUTUR: Cumuler les promos ou non
        for (let j = 0, lenj = products[i].relevantDiscount.length; j < lenj; j++) {
            const appliedPromoProduct = cloneDeep(savedProduct);
            applyRelevantDiscount(appliedPromoProduct, appliedPromoProduct.relevantDiscount[j]);
            if (appliedPromoProduct.price.priceSort.et < products[i].price.priceSort.et) {
                products[i] = {...appliedPromoProduct, price: {...appliedPromoProduct.price}};
            }
        }
        if (!keepObject) {
            products[i].isNew = false;
            if (products[i].associated_prds) {
                for (let k = 0; k < products[i].associated_prds.length; k++) {
                    products[i].associated_prds[k] = product.associated_prds[k];
                }
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
    product.price.priceSort = {
        et  : product.price.et.special,
        ati : product.price.ati.special
    };
    product.id.price        = product.price;
};

const checkForApplyPromo = async (userInfo, cart, lang = null, codePromo) => {
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
        if (typeof cart === 'string') {
            cart = await Cart.findOne({_id: cart}).populate('items.id');
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
    return oCart;
};

/**
 * Permet de verifier si les articles du panier sont eligibles aux quantity break
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
    // On cherche les promos de type panier (type: "1") et quantitybreak
    const promos = await Promo.find({discountType: 'QtyB', actif: true, type: '1'}, null, {sort: {priority: -1}});
    if (!promos || !promos.length) {
        return cart;
    }

    if (resetPromoCatalog) {
        // On réinitialise les prix spéciaux et on applique les promos catalogues éventuelles
        const productsCatalog = await checkPromoCatalog(cart.items.map((item) => item.id), user, lang, false);
        for (let i = 0, leni = cart.items.length; i < leni; i++) {
            cart = await applyPromoToCartProducts(productsCatalog, cart, i);
        }
    }

    const copyCart = JSON.parse(JSON.stringify(cart));

    // -----------------------------------------------------------------------------
    // ------------------- Application des règles de cette promo -------------------
    // -----------------------------------------------------------------------------
    // Nous devons appliquer les règles de chaque promo afin de savoir si l'utilisateur
    // peut beneficier d'une promo en fonction de ce que contient le panier

    let applyNextRules = true;
    let promoIndex     = 0;
    const promosLen    = promos.length;
    while (applyNextRules && promoIndex < promosLen) {
        let promo                  = promos[promoIndex];
        const {dateStart, dateEnd} = promo;

        // Validation du quantity break
        if ((dateStart === null || dateStart < currentDate) && (dateEnd === null || dateEnd > currentDate) && promo.actions.length > 0) {
            // promo = await promo.populate("rules_id").execPopulate();

            if (promo.actions.length > 0) {
                promo = await promo.populate('actions').execPopulate();

                for (let i = 0, leni = promo.actions.length; i < leni; i++) {
                    // on teste chaque action sur chaque produit
                    let statementResult = false;
                    for (let j = 0, lenj = copyCart.items.length; j < lenj; j++) {
                        const itemId      = copyCart.items[j].id._id.toString();
                        const baseProduct = await ProductSimple.findOne({_id: itemId}).lean();
                        const action      = await ServiceRules.applyRecursiveRulesDiscount(promo.actions[i], user, {items: [copyCart.items[j]]});

                        try {
                            // On test si l'eval peut renvoyer une erreur
                            statementResult = eval(promoUtils.createIfStatement(action));
                        } catch (error) {
                            throw NSErrors.PromoCodeIfStatementBadFormat;
                        }

                        if (statementResult) {
                            // si c'est true, on applique les actions
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

    return cart.save();
};

/**
 * Permet de verifier si un code panier est valide
 * @param {*} code
 * @param {*} idCart
 * @param {*} user
 * @param {*} lang
 */
const checkCodePromoByCode = async (code, idCart, user = null, lang = null) => {
    // -----------------------------------------------------------------------------
    // ------ Récupérations des données et check de la validité du code promo ------
    // -----------------------------------------------------------------------------
    const cart = await Cart.findById({_id: idCart}).populate('items.id');
    if (!cart) throw NSErrors.CartInactiveNotFound;
    // On cherche si un code promo correspondant a 'code' existe est actif et est de type panier (type: "1")
    const promo = await Promo.findOne({'codes.code': {$regex: code, $options: 'i'}, actif: true, type: '1'});
    if (!promo) {
        // Le code promo entré est mauvais alors on supprime l'ancien code promo
        await removePromoFromCart(cart);
        throw NSErrors.PromoNotFound;
    }
    const currentDate          = Date.now();
    const {dateStart, dateEnd} = promo;
    // On verifie que la date d'utilisation du code promo. Si elle n'est pas entre les bornes de dateStart et dateEnd,
    // alors on supprime le code promo du cart

    if ((dateStart && dateStart > currentDate) || (dateEnd && dateEnd < currentDate) ) {
        await removePromoFromCart(cart);
        throw NSErrors.PromoCodePromoInvalid;
    }

    const newCode = promo.codes.filter((codeFound) => (code).toLowerCase() === (codeFound.code).toLowerCase());
    // On check si le nombre total de fois ou le code a été utilisé est inférieur a la limit de fois ou le code est utilisable
    if (newCode[0].limit_total !== null && (newCode[0].used >= newCode[0].limit_total)) {
        await removePromoFromCart(cart);
        throw NSErrors.PromoCodePromoInvalid;
    }
    // On cherche le nombre de commande qu'a passé le client avec un code promo,
    // si son nombre de commande avec ce code promo est >= au promo.codes.limit_client (Le nombre de fois qu'un client peut utiliser ce code)
    // alors il ne pourra pas réutiliser le code promo
    if (user) {
        const orderWithCode = await Orders.find({'customer.id': user._id, 'promos.promoCodeId': newCode[0]._id});
        if (newCode[0].limit_client !== null && (orderWithCode.length === newCode[0].limit_client || orderWithCode.length >= newCode[0].limit_client)) {
            await removePromoFromCart(cart);
            throw NSErrors.PromoCodePromoLimitClientMax;
        }
    }
    // -----------------------------------------------------------------------------
    // ------------------- Application des règles de cette promo -------------------
    // -----------------------------------------------------------------------------
    // Nous devons appliquer les règles de cette promo afin de savoir si l'utilisateur
    // peut utiliser ce code promo en fonction de ce que contient le panier
    const validCartProduct = [];
    if (promo.rules_id) {
        const promoRules = await promo.populate('rules_id').execPopulate();
        if (promoRules.rules_id.conditions.length > 0 || promoRules.rules_id.other_rules.length > 0) {
            // TODO P5 (chaud): a supprimer si test avancé OK
            // On verifie que la requête s'effectue uniquement sur la collection product
            // const onlyProductRequest = ServiceRules.onlyProductRequest([promoRules.rules_id]);
            // if (onlyProductRequest) {
            //     const query = await ServiceRules.applyRecursiveRules([promoRules.rules_id], {});
            //     const productFound = await Productss.findOne(query);
            //     if (!productFound) {
            //         await removePromoFromCart(cart);
            //         throw global.errors_list.promo_code_promo_not_authorized;
            //     }
            //     // On recherche dans chaque item du cart si cart.items[i].id === productFound._id
            //     const tItems = cart.items.filter(product => product.id._id.toString() === productFound._id.toString());
            //     // Si aucun produit du panier ne correspond au produit trouvé avec les rules alors on renvoie une erreur
            //     if (!tItems.length) {
            //         await removePromoFromCart(cart);
            //         throw global.errors_list.promo_code_promo_not_authorized;
            //     }
            // } else {
            const tCondition  = await ServiceRules.applyRecursiveRulesDiscount(promoRules.rules_id, user, cart);
            const ifStatement = promoUtils.createIfStatement(tCondition);
            try {
                // On test si l'eval peut renvoyer une erreur
                eval(ifStatement);
            } catch (error) {
                throw NSErrors.PromoCodeIfStatementBadFormat;
            }
            // Si l'utilisateur ne peut pas utiliser ce code nous renvoyons une erreur
            if (!eval(ifStatement)) {
                await removePromoFromCart(cart);
                throw NSErrors.PromoCodePromoNotAuthorized;
            }
            // }
        }
    }
    // -----------------------------------------------------------------------------
    // ---------------------- Calcul et création du code promo ---------------------
    // -----------------------------------------------------------------------------
    // const oldProductsId = [];
    // if (cart.promos && cart.promos.length && cart.promos[0].productsId && cart.promos[0].productsId.length && validCartProduct.length) {
    //     for (let i = 0; i < validCartProduct.length; i++) {
    //         const idx = cart.promos[0].productsId.findIndex(prd => prd.productId.toString() === validCartProduct[i].id);
    //         if (idx === -1) continue;
    //         oldPromo = [cart.promo[0].productsId];
    //     }
    // }
    // Pour le moment l'utilisateur ne peut entrer qu'un seul code promo, nous forçons donc la promos a être un tableau d'un element
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
    // La promo panier donne droit a une réduction ou a des cadeaux offerts
    if (promo.gifts.length) {
        // Récupération de la langue par défaut
        if (!lang) {
            const language = await Languages.findOne({defaultLanguage: true});
            lang           = language.code;
        }
        const promoWithGiftsPopulated = await promo.populate('gifts').execPopulate();
        // On ajoute les produits au gifts du cart
        promoWithGiftsPopulated.gifts.forEach((gift) => {
            const {_id, translation, attributes} = gift;
            const price                          = {unit: {ati: 0, et: 0}, vat: {rate: gift.price.tax}};
            cart.promos[0].gifts.push({id: _id, name: translation[lang].name, price, quantity: 1, atts: attributes, opts: []});
        });
    } else {
        // Si validCartProduct contient des produits alors nous devons appliquer la réduction
        // sur ces produits et pas sur le montant total du panier
        if (validCartProduct.length > 0) {
            // On met les discountATI et discountET à 0 cart il n'y a pas de remise sur le total du panier
            cart.promos[0].discountATI = 0;
            cart.promos[0].discountET  = 0;
            for (let i = 0; i < validCartProduct.length; i++) {
                const {discountATI, discountET, basePriceATI, basePriceET} = calculCartDiscountItem(validCartProduct[i], promo, cart);
                cart.promos[0].productsId.push({productId: validCartProduct[i].id.id, discountATI, discountET, basePriceATI, basePriceET});
            }
        } else {
            // Si validCartProduct contient des produits alors nous devons appliquer la réduction
            // sur ces produits et pas sur le montant total du panier
            if (validCartProduct.length > 0) {
                // On met les discountATI et discountET à 0 cart il n'y a pas de remise sur le total du panier
                cart.promos[0].discountATI = 0;
                cart.promos[0].discountET  = 0;
                for (let i = 0; i < validCartProduct.length; i++) {
                    const baseProduct                                          = await ProductSimple.findOne({code: validCartProduct[i].code}).lean();
                    const {discountATI, discountET, basePriceATI, basePriceET} = await calculDiscountItem(baseProduct, promo);
                    cart.promos[0].productsId.push({productId: validCartProduct[i].id.id, discountATI, discountET, basePriceATI, basePriceET});
                }
            } else {
                // L'utilisateur peut utiliser ce code, nous devons donc enregistrer le code promo dans son cart
                const {discountATI, discountET} = await calculCartDiscount(cart, promo);
                if (discountATI !== null) {
                    cart.promos[0].discountATI = discountATI;
                }
                if (discountET !== null) {
                    cart.promos[0].discountET = discountET;
                }
            }
        }
    }
    const resultCart = await cart.save();
    return resultCart;
};

async function removePromoFromCart(cart) {
    cart.promos = [];
    return cart.save();
}
/**
 * Fonction permettant de verifier qu'un codes.code est bien unique dans les documents promos
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
 * Permet de calculer la promo d'un produit
 * @param {*} prd
 * @param {*} promo
 */
function calculDiscountItem(prd, promo) {
    // On calcule le total avec remise du panier
    let values                          = {discountATI: 0, discountET: 0};
    const {discountType, discountValue} = promo;

    // Si le discountType est du pourcentage
    if (discountType === 'P') {
        // On calcule la réduction a appliquer sur le produit, si réduction > au prix de l'article alors on
        // applique une réduction égal au prix de l'article afin de ne pas avoir un prix negatif, on aura ainsi un prix = à 0
        values = calculateCartItemDiscount(prd.price.priceSort, prd.price.priceSort.et * (discountValue / 100));
    } else if (discountType === 'Aet') {
        values = calculateCartItemDiscount(prd.price.priceSort, discountValue, undefined);
    } else if (discountType === 'Aati') {
        values = calculateCartItemDiscount(prd.price.priceSort, undefined, discountValue);
    }

    return values;
}

/**
 * Permet de calculer la promo sur un item du panier
 * @param {*} item item du cart qui aura la promo
 * @param {*} promo
 */
async function calculCartDiscountItem(item, promo) {
    // On calcule le total avec remise du panier
    let values                          = {discountATI: 0, discountET: 0};
    const {discountType, discountValue} = promo;
    const baseProduct                   = await ProductSimple.findOne({code: item.code}).lean();

    // Si le discountType est du pourcentage
    if (discountType === 'P') {
        // On calcule la réduction a appliquer sur le produit, si réduction > au prix de l'article alors on
        // applique une réduction égal au prix de l'article afin de ne pas avoir un prix negatif, on aura ainsi un prix = à 0
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
 * Permet de calculer le total du panier avec réduction, ce total devra être ajouté a cart.promos[0].priceATI
 * @param {Cart} cart
 * @param {Promo} promo
 //* @param {Boolean} isQuantityBreak permet de calculer le total cart.priceTotal sans prendre en compte le cart.quantityBreaks
 */
async function calculCartDiscount(cart, promo = null/* , isQuantityBreak = false */) {
    if (!promo) return null;
    // On calcule le total avec remise du panier
    let values                          = {discountATI: 0, discountET: 0};
    const {discountType, discountValue} = promo;
    const priceTotal                    = await calculateCartTotal(cart);
    // if (isQuantityBreak) {
    //     priceTotal = cart.calculateBasicTotal();
    // } else {
    //     priceTotal = cart.priceTotal;
    // }
    // priceTotal = await calculateCartTotal(cart);
    // On calcul la prix total avant l'application des codes promo et avant l'application des quantityBreaks
    // Si le discountType est du pourcentage
    if (discountType === 'P') {
        // Si le prix TTC/HT est inférieur a la remise alors on met une remise correspondant au prix du cart total
        // afin d'avoir priceTotal - discountATI (ou discountET) = 0
        values = calculateCartItemDiscount(
            priceTotal,
            priceTotal.et * (discountValue / 100)
        );
    } else if (discountType === 'Aet') {
        // le discountType est un montant
        // Si le prix TTC/HT est inférieur a la remise alors on met une remise correspondant au prix du cart
        // afin d'avoir priceTotal - discountATI (ou discountET) = 0
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
        return _prd._id.toString() === idProduct.toString();
    });
    if (prdIndex > -1) {
        if (cart.items[cartPrdIndex].id === mongoose.Types.ObjectId) {
            await cart.populate('items.id');
        }
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
    const rate      = Number((prices.ati / prices.et).toFixed(2));

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
        discountET  : Number(discountET.toFixed(2)),
        discountATI : Number(discountATI.toFixed(2))
    };
}

async function resetCartProductPrice(cart, j) {
    if (cart.items[j].noRecalculatePrice) {
        return cart;
    }
    // on recupere le produit en base et on y réapplique ses valeur (prix)
    const baseProduct        = await ProductSimple.findOne({code: cart.items[j].code}).lean();
    cart.items[j].price.unit = {et: baseProduct.price.et.normal, ati: baseProduct.price.ati.normal};
    if (baseProduct.price.et.special || baseProduct.price.ati.special) {
        // on set le prix special ET s'il y en a un
        if (baseProduct.price.et.special) {
            cart.items[j].price.special = {et: baseProduct.price.et.special};
        }
        // on set le prix special ATI s'il y en a un et si le prix ET n'a pas precedement ete ajouté
        if (baseProduct.price.ati.special && !cart.items[j].price.special) {
            cart.items[j].price.special = {ati: baseProduct.price.ati.special};
        }
        // on set le prix special ATI s'il y en a un et si le prix ET a été precedement ajouté
        if (baseProduct.price.ati.special && cart.items[j].price.special) {
            cart.items[j].price.special.ati = baseProduct.price.ati.special;
        }
    } else {
        cart.items[j].price.special = undefined;
    }
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

const calculDiscount = (myCart) => {
    if (myCart.discount && myCart.discount.length === 0) {
        return;
    }

    const discount = myCart.discount[0];

    // Si la promo s'applique sur tout le site
    if (discount.onAllSite) {
        const total = myCart.priceTotal.ati;

        if (total >= discount.minimumATI) {
            let discountAmount = 0;
            switch (discount.type) {
            case 'PERCENT':
                discountAmount = (total * discount.value) / 100;
                break;
            case 'PRICE':
                discountAmount = discount.value;
                break;
            default:
                // TODO P6 : Gérer la livraison gratuite
            }
            myCart.discount[0].priceATI = discountAmount;
        } else {
            myCart.discount[0].priceATI = 0;
        }
    } else {
        // si la promo ne s'applique pas sur tout le site
        myCart.discount[0].priceATI = 0;
    }
};

module.exports = {
    calculDiscount,
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
