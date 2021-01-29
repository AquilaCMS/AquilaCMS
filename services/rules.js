/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {
    Rules,
    Users,
    Categories,
    Pictos,
    Products,
    Promo
}                      = require('../orm/models');
const utils        = require('../utils/utils');
const promoUtils   = require('../utils/promo');
const QueryBuilder = require('../utils/QueryBuilder');
const NSErrors     = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Rules, restrictedFields, defaultFields);

const inSegment = {};
// colNames nom des collections: si le target d'une condition commence par 'colNames[i].' alors nous renvoyons false
const colNames = ['client', 'famille', 'categorie', 'panier'];

const listRules = (PostBody) => {
    return queryBuilder.find(PostBody);
};

const queryRule = (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

/**
 * @function testUser
 * @param {Object} body - Contient le user_id pour lequel on souhaite recevoir les discount
 * @param {string} body.user_id user id to get discount
 * @return {Promise<array<{}>>} - Tableau des promo applicable sur le user en question
 */
const testUser = async (body) => {
    const _rules = await Rules.find({owner_type: 'discount'});
    const user   = await Users.findOne({_id: body.user_id});
    const result = [];
    for (let i = 0; i < _rules.length; i++) {
        const condition = await testRulesOnUser(_rules[i], user);
        if (eval(promoUtils.createIfStatement(condition))) {
            const promo = await Promo.findById(_rules[i].owner_id);
            if (promo) result.push({...promo.toObject(), applyResult: condition});
        }
    }
    return result;
};

const setRule = async (rule) => {
    if (!rule) throw NSErrors.UnprocessableEntity;
    if (rule._id) {
        return Rules.findOneAndUpdate({_id: rule._id}, rule, {new: true});
    }
    if (rule.other_rules && rule.other_rules.length) {
        // On ajoute owner_id et owner_type a chaque other_rules récusivement
        const {owner_id, owner_type} = rule;
        (function addRequiredField(other_rules) {
            for (let i = 0; i < other_rules.length; i++) {
                if (other_rules[i].other_rules && other_rules[i].other_rules.length) {
                    addRequiredField(other_rules[i].other_rules);
                }
                // Si rule de type panier.xxx alors owner_type existera
                if (!other_rules[i].owner_type) other_rules[i].owner_type = owner_type;
                if (!other_rules[i].owner_id) other_rules[i].owner_id = owner_id;
            }
        }(rule.other_rules));
    }
    return Rules.create(rule);
};

const deleteRule = async (_id) => {
    if (!_id) throw NSErrors.UnprocessableEntity;
    const rule = await queryBuilder.findById(_id);
    let result = {};
    if (rule) {
        if (rule.other_rules.length) {
            for (let i = 0; i < rule.other_rules.length; i++) {
                deleteRule(rule.other_rules[i]);
            }
        } else {
            result = await Rules.deleteOne({_id});
        }
    }
    return result.ok === 1;
};

function conditionOperator(operator, obj, target, value) {
    let isTrue = false;
    try {
        // Si value est un tableau (ex: attribut de type select multiple)
        if (Object.prototype.toString.call(value) !== '[object String]' && value.length > -1) {
            for (let i = 0; i < value.length; i++) {
                if (operator === 'contains') isTrue = isTrue || utils.getObjFromDotStr(obj, target).includes(value[i]);
                else if (operator === 'ncontains') isTrue = isTrue || !utils.getObjFromDotStr(obj, target).includes(value[i]);
                else if (operator === 'eq') isTrue = isTrue || utils.getObjFromDotStr(obj, target) === value[i];
                else if (operator === 'neq') isTrue = isTrue || utils.getObjFromDotStr(obj, target) !== value[i];
                else if (operator === 'startswith') isTrue = isTrue || utils.getObjFromDotStr(obj, target).startsWith(value[i]);
                else if (operator === 'endswith') isTrue = isTrue || utils.getObjFromDotStr(obj, target).endsWith(value[i]);
                else if (operator === 'gte') isTrue = isTrue || utils.getObjFromDotStr(obj, target) >= value[i];
                else if (operator === 'gt') isTrue = isTrue || utils.getObjFromDotStr(obj, target) > value[i];
                else if (operator === 'lte') isTrue = isTrue || utils.getObjFromDotStr(obj, target) <= value[i];
                else if (operator === 'lt') isTrue = isTrue || utils.getObjFromDotStr(obj, target) < value[i];
            }
        } else {
            if (operator === 'contains') isTrue = utils.getObjFromDotStr(obj, target).includes(value);
            else if (operator === 'ncontains') isTrue = !utils.getObjFromDotStr(obj, target).includes(value);
            else if (operator === 'eq') isTrue = utils.getObjFromDotStr(obj, target) === value;
            else if (operator === 'neq') isTrue = utils.getObjFromDotStr(obj, target) !== value;
            else if (operator === 'startswith') isTrue = utils.getObjFromDotStr(obj, target).startsWith(value);
            else if (operator === 'endswith') isTrue = utils.getObjFromDotStr(obj, target).endsWith(value);
            else if (operator === 'gte') isTrue = utils.getObjFromDotStr(obj, target) >= value;
            else if (operator === 'gt') isTrue = utils.getObjFromDotStr(obj, target) > value;
            else if (operator === 'lte') isTrue = utils.getObjFromDotStr(obj, target) <= value;
            else if (operator === 'lt') isTrue = utils.getObjFromDotStr(obj, target) < value;
        }
        return isTrue;
    } catch (error) {
        console.error(error);
        return false;
    }
}

// /**
//  * Fonction récursive qui va construire un tableau dans une forme normalisé pour le produit dont l'index est passé en tant que indexPrd.
//  * si un panier contient 2 produits et qu'une rule a 3 conditions panier
//  * alors nous auront 3 tableaux (pour les 3 conditions)
//  * contenant chacun 2 boolean (correspondant aux deux produits) ex : norm_conditions= ["ET", [true, false], [true, true], [true, false]]
//  * Les premiers champs des tableaux correspondront au produit 1, les seconds correspondront au produit 2
//  * Nous allons donc pour chaque produit normaliser norm_conditions afin qu'il soit utilisé par promoUtils.createIfStatement
//  * @param {*} norm_conditions
//  * @param {*} indexPrd index du produit
//  * @param {*} res
//  */
// function normalizeConditions(norm_conditions, indexPrd, res = []) {
//     for (let i = 0; i < norm_conditions.length; i++) {
//         if (norm_conditions[i] instanceof Array && typeof norm_conditions[i][0] !== "string") {
//             // On ajoute les booleans a booleanToMerge
//             const boolNormCond = norm_conditions[i].find((cdt, idx) => idx === indexPrd);
//             res.push(boolNormCond);
//         } else if (typeof norm_conditions[i] === "string") {
//             res.push(norm_conditions[i]);
//         } else {
//             // on a un tableau qui commence par 'ET' ou 'OU', on reboucle dessus
//             const subRes = normalizeConditions(norm_conditions[i], indexPrd);
//             res.push(subRes);
//         }
//     }
//     return res;
// }

// function getCartBoolean(subCondition, itemsOk, nbRuleCartValid, validCartProduct) {
//     let isTrue = false;
//     for (let k = 0; k < itemsOk.length; k++) {
//         const product = itemsOk[k];
//         const tCartCondition = normalizeConditions(subCondition, k);
//         const ifStatement = promoUtils.createIfStatement(tCartCondition);
//         try {
//             // On test si l'eval peut renvoyer une erreur
//             eval(ifStatement);
//         } catch (error) {
//             throw global.errors_list.promo_code_if_statement_bad_format;
//         }
//         // Si la panier contient le
//         if (eval(ifStatement)) {
//             validCartProduct.push(product);
//         }
//     }
//     if (validCartProduct.length > 0) {
//         nbRuleCartValid++;
//         isTrue = true;
//     }
//     return {isTrue, nbRuleCartValid};
// }

/**
 * Permet de connaître la validité d'une promotion de type panier
 * @param {ModelRules} rule la rule a traiter
 * @param {ModelUsers} user utilisateur qui a initié la requete
 * @param {ModelCart} cart le panier de l'utilisateur
 * @param {Boolean} isCart si true alors on est dans une condition de type "panier.qte_min"
 * @param {Boolean} isRoot Permet de savoir si nous somme a la rule racine
 */
async function applyRecursiveRulesDiscount(rule, user, cart/* , isCart = false, isRoot = false */) {
    try {
        // fix par rapport a la limitation des champs du user ...
        if (user) {
            user = await Users.findById(user._id);
        }
        const tCondition = [rule.operand];
        for (let j = 0; j < rule.conditions.length; j++) {
            const condition = rule.conditions[j];
            let target      = condition.target.replace('attr.', 'attributes.');
            let isTrue      = false;
            const value     = getValueFromCondition(condition);
            // colNames est le nom des collections (c'est une variable en global)
            const tColNamesFound = colNames.filter((colName) => target.startsWith(`${colName}.`));
            // Si un colNames est trouvé dans le target alors ce n'est pas un champ produit
            if (tColNamesFound.length > 0) {
                if (target.startsWith('client.')) {
                    // Si user n'existe pas (qu'il rentre un code promo non connecté)
                    if (!user || Object.keys(user).length === 0) {
                        isTrue = false;
                    } else {
                        if (target.indexOf('attributes') > -1) {
                            const targetCode = target.split('.')[target.split('.').length - 1];
                            const targetLang = target.split('.')[target.split('.').length - 2];
                            const attr       = user.attributes.find((attr) => attr.code === targetCode);
                            if (attr) {
                                target = `translation.${targetLang}.value`;
                                isTrue = conditionOperator(condition.operator, attr, target, value);
                            }
                        } else {
                            // Si l'utilisateur est connecté nous verifions si le champ correspond a la value
                            isTrue = conditionOperator(condition.operator, user, target.replace('client.', ''), value);
                        }
                    }
                } else if (target.startsWith('categorie.') && cart) {
                    isTrue = await checkCartPrdInCategory(cart, target, value, isTrue);
                } else if (target.startsWith('panier.') && cart) {
                    target = target.replace('panier.', '');
                    isTrue = conditionOperator(condition.operator, {priceTotal: await calculateCartTotal(cart)}, target, value);
                }
            } else {
                // Lorsque les conditions et other_rules ne sont pas dans une condition  "panier.qte_min", nous avons juste a verifier si
                // les conditions exprimées dans les rules existent dans le panier
                // ex: on applique une réduction si le panier contient des articles avec le code: 17WONDERSB01 et le slug: jeux-de-societe/abyss
                // si le produit1 contient le code 17WONDERSB01 et que le produit2 contient le slug jeux-de-societe/abyss
                // alors la condition sera vrai car c'est sur l'ensemble des produits du panier que ces conditions sont verifiées
                if (target.indexOf('attributes') > -1) {
                    for (let i = 0; i < cart.items.length; i++) {
                        if (cart.items[i].id.attributes) {
                            const targetCode = target.split('.')[target.split('.').length - 1];
                            const targetLang = target.split('.')[target.split('.').length - 2];
                            const attr       = cart.items[i].id.attributes.find((attr) => attr.code === targetCode);
                            if (attr) {
                                target = `translation.${targetLang}.value`;
                                isTrue = conditionOperator(condition.operator, attr, target, value);
                            }
                        }
                    }
                } else {
                    let tItems = [];
                    tItems     = cart.items.filter((product) => conditionOperator(condition.operator, product, target, value));
                    if (tItems.length) isTrue = true;
                }
            }
            tCondition.push(isTrue);
        }
        if (rule.other_rules && rule.other_rules.length > 0) {
            for (let k = 0; k < rule.other_rules.length; k++) {
                const other_rule   = rule.other_rules[k];
                const subCondition = await applyRecursiveRulesDiscount(other_rule, user, cart);
                tCondition.push(subCondition);
            }
        }
        return tCondition;
    } catch (error) {
        console.error(error);
    }
}

/**
 * Permet de connaître la validité d'une promotion de type panier
 * @param {ModelRules} rule la rule a traiter
 * @param {ModelUsers} user utilisateur qui a initié la requete
 * @param {ModelCart} cart le panier de l'utilisateur
 * @param {Boolean} isCart si true alors on est dans une condition de type "panier.qte_min"
 * @param {Boolean} isRoot Permet de savoir si nous somme a la rule racine
 */
async function testRulesOnUser(rule, user, cart = undefined) {
    try {
        const tCondition = [rule.operand];
        const validRules = [];
        for (let j = 0; j < rule.conditions.length; j++) {
            const condition = rule.conditions[j];
            const target    = condition.target.replace('attr.', 'attributes.');
            let isTrue      = true;
            const value     = getValueFromCondition(condition);
            // colNames est le nom des collections (c'est une variable en global)
            const tColNamesFound = colNames.filter((colName) =>  target.startsWith(`${colName}.`));
            // Si un colNames est trouvé dans le target alors ce n'est pas un champ produit
            if (tColNamesFound.length > 0) {
                const key = target.split('.')[1];
                if (target.startsWith('client.')) {
                    // Si user n'existe pas (qu'il rentre un code promo non connecté)
                    if (!user) {
                        isTrue = false;
                    } else {
                        // Si l'utilisateur est connecté nous verifions si le champ correspond a la value
                        isTrue = conditionOperator(condition.operator, user, key, value);
                        if (isTrue) {
                            validRules.push(rule);
                        }
                    }
                } else if (target.startsWith('categorie.') && cart !== undefined) {
                    isTrue = await checkCartPrdInCategory(cart, target, value, isTrue);
                }
            } else if (cart !== undefined) {
                // Lorsque les conditions et other_rules ne sont pas dans une condition  "panier.qte_min", nous avons juste a verifier si
                // les conditions exprimées dans les rules existent dans le panier
                // ex: on applique une réduction si le panier contient des articles avec le code: 17WONDERSB01 et le slug: jeux-de-societe/abyss
                // si le produit1 contient le code 17WONDERSB01 et que le produit2 contient le slug jeux-de-societe/abyss
                // alors la condition sera vrai car c'est sur l'ensemble des produits du panier que ces conditions sont verifiées
                const tItems = cart.items.filter((product) => conditionOperator(condition.operator, product, target, value));
                if (tItems.length) isTrue = true;
            }
            tCondition.push(isTrue);
        }
        if (rule.other_rules && rule.other_rules.length > 0) {
            for (let k = 0; k < rule.other_rules.length; k++) {
                const other_rule   = rule.other_rules[k];
                const subCondition = await applyRecursiveRulesDiscount(other_rule, user, cart);
                tCondition.push(subCondition);
            }
        }
        return tCondition;
    } catch (error) {
        console.error(error);
    }
}

/**
 * Permet de checker si une autre collection que produit est utilisé. Si uniquement produit est utilisé nous pourrons
 * appliquer les règle avec la fonction applyRecursiveRules
 * Nous allons itérer récursivement a travers les rules et other rules afin de savoir si le target d'une condition commence par colNames[i]
 * Si tel est le cas alors nous n'utiliseront pas applyRecursiveRules
 * @param {*} _rules
 */
function onlyProductRequest(_rules) {
    utils.tmp_use_route('rules_service', 'onlyProductRequest');

    let onlyProduct = true;
    for (let i = 0; i < _rules.length; i++) {
        const rule = _rules[i];
        for (let j = 0; j < rule.conditions.length; j++) {
            const condition = rule.conditions[j];
            // colNames est le nom des collections (c'est une variable en global)
            const tColNamesFound = colNames.filter((colName) =>  condition.target.startsWith(`${colName}.`));
            // Si un colNames est trouvé dans le target alors on return false
            if (tColNamesFound.length > 0) return false;
        }
        if (rule.other_rules && rule.other_rules.length > 0) {
            onlyProduct = onlyProductRequest(rule.other_rules);
            if (onlyProduct === false) return onlyProduct;
        }
    }
    return onlyProduct;
}

async function applyRecursiveRules(_rules, query) {
    // Pour chaque règle
    for (let i = 0; i < _rules.length; i++) {
        const rule = _rules[i];

        // Pour chaque condition de la règle
        for (let j = 0; j < rule.conditions.length; j++) {
            const condition = rule.conditions[j];
            // On récupère le champ target qui contient le champ à comparer et le champ value
            let target = condition.target;
            let value  = condition.value;
            if (condition.type === 'number') {
                value = Number(condition.value);
            } else if (condition.type === 'bool') {
                value = condition.value === 'true';
            }
            const queryConds = {};

            // Traitement spécial si c'est un attribut (contient attr.)
            if (target.includes('attr.')) {
                target         = target.replace('attr.', '');
                const attrLang = target.split('.')[target.split('.').length - 2];
                const attrCode = target.split('.')[target.split('.').length - 1];
                // et tester la valeur de cet attribut
                target = 'attributes';
                if (Object.prototype.toString.call(value) !== '[object String]' && value.length !== undefined) {
                    value = {
                        $elemMatch : {
                            code                              : attrCode,
                            [`translation.${attrLang}.value`] : {$in: value}
                        }
                    };
                } else {
                    value = {
                        $elemMatch : {
                            code                              : attrCode,
                            [`translation.${attrLang}.value`] : value
                        }
                    };
                }
            } else if (target.includes('categorie.')) {
                target = target.replace('categorie.', '');
                // On récupère le "modèle" attribut dans un produit pour connaitre l'index de l'attribut en question
                const cat = await Categories.findOne({[`${target}`]: value}).lean();
                if (cat) {
                    target = '_id';
                    value  = {$in: cat.productsList.map((item) => item.id)};
                }
            } else if (target === 'qty') {
                target = 'stock.qty';
            }
            if (Object.prototype.toString.call(value) === '[object String]' || value.length === undefined) {
                value = [value];
            }

            for (let i = 0; i < value.length; i++) {
                // Gestion des opérateur (transformation expression -> opérateur mongo)
                if (condition.operator === 'contains') {
                    if (Object.prototype.toString.call(value[i]) === '[object String]') {
                        queryConds[target] = new RegExp(value[i]);
                    } else {
                        queryConds[target] = value[i];
                    }
                } else if (condition.operator === 'ncontains') {
                    if (Object.prototype.toString.call(value[i]) === '[object String]') {
                        queryConds[target] = {$not: new RegExp(value[i])};
                    } else {
                        queryConds[target] = value[i];
                    }
                } else if (condition.operator === 'eq') {
                    queryConds[target] = value[i];
                } else if (condition.operator === 'neq') {
                    queryConds[target] = {$ne: value[i]};
                } else if (condition.operator === 'startswith') {
                    if (Object.prototype.toString.call(value[i]) === '[object String]') {
                        queryConds[target] = new RegExp(`^${value[i]}`);
                    } else {
                        queryConds[target] = value[i];
                    }
                } else if (condition.operator === 'endswith') {
                    if (Object.prototype.toString.call(value[i]) === '[object String]') {
                        queryConds[target] = new RegExp(`${value[i]}$`);
                    } else {
                        queryConds[target] = value[i];
                    }
                } else if (condition.operator === 'gte') {
                    queryConds[target] = {$gte: value[i]};
                } else if (condition.operator === 'gt') {
                    queryConds[target] = {$gt: value[i]};
                } else if (condition.operator === 'lte') {
                    queryConds[target] = {$lte: value[i]};
                } else if (condition.operator === 'lt') {
                    queryConds[target] = {$lt: value[i]};
                }

                if (rule.operand === 'ET') {
                    Object.assign(query, queryConds);
                } else {
                    if (query.$or === undefined) {
                        query.$or = [];
                    }

                    query.$or.push(queryConds);
                }
            }
        }

        if (rule.operand === 'ET') {
            if (rule.other_rules && rule.other_rules.length > 0) {
                Object.assign(query, await applyRecursiveRules(rule.other_rules, query));
            }
        } else {
            if (query.$or === undefined) {
                query.$or = [];
            }

            if (rule.other_rules && rule.other_rules.length > 0) {
                query.$or.push({});
                Object.assign(query.$or[query.$or.length - 1], await applyRecursiveRules(rule.other_rules, query.$or[query.$or.length - 1]));
            }
        }
    }

    return query;
}

// eslint-disable-next-line no-unused-vars
const execRules = async (owner_type, products = [], optionPictoId = undefined) => {
    const result = [];
    let logValue = '';
    // La catégorisation est-elle en cours ?
    if (inSegment[owner_type] === undefined || inSegment[owner_type] === false) {
        logValue = `${new Date()}) Début de la catégorisation(${owner_type}) automatique`;
        console.log('\x1b[1m\x1b[33m', logValue, '\x1b[0m');
        result.push(logValue);
        inSegment[owner_type] = true;
        const _rules          = await Rules.find(owner_type ? {owner_type} : {});
        const splittedRules   = {};
        const productsPromise = [];

        // On tri les règles selon leur type (picto, category ...)
        for (let i = 0; i < _rules.length; i++) {
            if (splittedRules[_rules[i].owner_type] === undefined) {
                splittedRules[_rules[i].owner_type] = [];
            }
            if (_rules[i].conditions.length > 0) {
                splittedRules[_rules[i].owner_type].push(_rules[i]);
            }
        }

        const splittedRulesKeys = Object.keys(splittedRules);

        for (let i = 0; i < splittedRulesKeys.length; i++) {
            for (let j = 0; j < splittedRules[splittedRulesKeys[i]].length; j++) {
                // On prépare la requête pour récupérer tout les produits qui seront concernés par les règles
                productsPromise.push(Products.find(await applyRecursiveRules([splittedRules[splittedRulesKeys[i]][j]], {})));
            }
        }
        try {
            if (owner_type === 'picto') {await Products.updateMany({}, {$set: {pictos: []}});}
            const _products = await Promise.all(productsPromise);
            if (_products.length <= 0) {
                inSegment[owner_type] = false;
                logValue              = `\x1b[1m\x1b[32m${new Date()}) Aucune catégorisation(${owner_type}) automatique à faire\x1b[0m`;
                console.log(logValue);
                result.push(logValue);
            }
            for (let i = 0; i < splittedRulesKeys.length; i++) {
                for (let j = 0; j < splittedRules[splittedRulesKeys[i]].length; j++) {
                    const productsIds = _products[j].map((prd) => prd._id);

                    // Segmentation Categories
                    if (splittedRulesKeys[i] === 'category') {
                        const oldCat = await Categories.findOne({_id: splittedRules[splittedRulesKeys[i]][j].owner_id, active: true});
                        const cat    = await Categories.findOneAndUpdate(
                            {_id: splittedRules[splittedRulesKeys[i]][j].owner_id},
                            {$set: {productsList: []}},
                            {new: true}
                        );
                        if (cat) {
                            // Get product setted manually
                            cat.productsList = oldCat.productsList.filter(ou => ou.checked || productsIds.includes(ou.id));

                            // On transforme la liste de produit en object dont la key est l'_id du produit
                            // nous pourrons ainsi facilement trouver les produits
                            const oProductsListCat = {};
                            if (oldCat && oldCat.productsList) {
                                for (let k = 0; k < oldCat.productsList.length; k++) {
                                    const product                           = oldCat.productsList[k];
                                    oProductsListCat[product.id.toString()] = product;
                                }
                            }
                            for (let k = 0; k < productsIds.length; k++) {
                                if (!oProductsListCat[productsIds[k].toString()]) {
                                    cat.productsList.push({id: productsIds[k], checked: false});
                                } else {
                                    cat.productsList.push({
                                        id         : productsIds[k],
                                        checked    : oProductsListCat[productsIds[k].toString()].checked,
                                        sortWeight : oProductsListCat[productsIds[k].toString()].sortWeight
                                    });
                                }
                            }
                            await cat.save();
                        }
                    }
                    // Segementation picto
                    else if (splittedRulesKeys[i] === 'picto') {
                        let picto;
                        // fix 'feature-pictorisation' (https://trello.com/c/1ys0BQt3/1721-feature-pictorisation-dans-picto)
                        if (!optionPictoId || optionPictoId === splittedRules[splittedRulesKeys[i]][j].owner_id) {
                            picto = await Pictos.findOne({_id: splittedRules[splittedRulesKeys[i]][j].owner_id, enabled: true});
                        } else {
                            picto = await Pictos.findOne({_id: optionPictoId, enabled: true});
                        }
                        if (picto) {
                            const pictoData = {code: picto.code, image: picto.filename, pictoId: picto._id, title: picto.title, location: picto.location};
                            await Products.updateMany({_id: {$in: productsIds}, pictos: {$ne: pictoData}}, {$push: {pictos: pictoData}});
                        }
                    } else {
                        logValue = `=== owner_type(${splittedRulesKeys[i]}) inconnu ===`;
                        console.warn(logValue);
                        result.push(logValue);
                    }
                }
            }

            inSegment[owner_type] = false;
            logValue              = `${new Date()}) Fin de la catégorisation(${owner_type}) automatique`;
            console.log('\x1b[1m\x1b[32m', logValue, '\x1b[0m');
            result.push(logValue);
        } catch (err) {
            inSegment[owner_type] = false;
            logValue              = `${new Date()}) Fin de la catégorisation(${owner_type}) automatique`;
            console.log('\x1b[1m\x1b[31m', logValue, '\x1b[0m');
            result.push(logValue);
            console.error(err);
            result.push(err);
        }
    } else {
        logValue = `${new Date()}) Catégorisation automatique(${owner_type}) déjà en cours`;
        console.log('\x1b[1m\x1b[33m', logValue, '\x1b[0m');
        result.push(logValue);
    }
    return result;
};

const stopExecOnError = (owner_type) => {
    utils.tmp_use_route('rules_service', 'stopExecOnError');

    inSegment[owner_type] = false;
    console.log(`\x1b[1m\x1b[31mCatégorisation(${owner_type}) automatique en erreur réinitialisé\x1b[0m`);
};

module.exports = {
    listRules,
    queryRule,
    testUser,
    setRule,
    deleteRule,
    stopExecOnError,
    execRules,
    applyRecursiveRules,
    onlyProductRequest,
    applyRecursiveRulesDiscount
};

async function checkCartPrdInCategory(cart, target, value, isTrue) {
    const key  = target.slice(target.indexOf('.') + 1);
    const _cat = await Categories.findOne({[key]: value});

    if (_cat) {
        let i      = 0;
        const leni = cart.items.length;

        while (isTrue === false && i < leni) {
            const prd = _cat.productsList.find((_prd) => _prd.id.toString() === cart.items[i].id._id.toString());
            if (prd) {
                isTrue = true;
            }
            i++;
        }
    }
    return isTrue;
}

function getValueFromCondition(condition) {
    if (condition.type === 'number')  return Number(condition.value);
    if (condition.type === 'bool')  return condition.value === 'true';
    return condition.value;
}

async function calculateCartTotal(cart) {
    const total = {ati: 0, et: 0};
    for (let i = 0; i < cart.items.length; i++) {
        const item = await Products.findOne({code: cart.items[i].code});
        total.ati += (item.price.ati.special ? item.price.ati.special : item.price.ati.normal) * cart.items[i].quantity;
        total.et  += (item.price.et.special ? item.price.et.special : item.price.et.normal) * cart.items[i].quantity;
    }
    return total;
}
