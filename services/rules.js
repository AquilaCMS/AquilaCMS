/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose     = require('mongoose');
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
// colNames name of collections: if the target of a condition starts with 'colNames[i].' then we return false
const colNames = ['client', 'famille', 'categorie', 'panier'];

const listRules = (PostBody) => queryBuilder.find(PostBody);

const queryRule = (PostBody) => queryBuilder.findOne(PostBody);

/**
 * @function testUser
 * @param {Object} body - Contains the user_id for which you want to receive discounts
 * @param {string} body.user_id user id to get discount
 * @return {Promise<array<{}>>} - Table of promotions applicable to the user in question
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
        // We add owner_id and owner_type to each other_rules
        const {owner_id, owner_type} = rule;
        (function addRequiredField(other_rules) {
            for (let i = 0; i < other_rules.length; i++) {
                if (other_rules[i].other_rules && other_rules[i].other_rules.length) {
                    addRequiredField(other_rules[i].other_rules);
                }
                // Si rule de type cart.xxx alors owner_type will exist
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
    if (typeof obj !== 'object') return;
    try {
        // If value is an array (ex: multiple select attribute)
        if (value && Object.prototype.toString.call(value) !== '[object String]' && value.length > -1) {
            for (let i = 0; i < value.length; i++) {
                if (operator === 'contains') {
                    if (!isTrue) {
                        const objVal = utils.getObjFromDotStr(obj, target);
                        if (typeof objVal === 'undefined' && (typeof value === 'undefined' || value === '')) isTrue = true;
                        else if (objVal) isTrue = objVal.includes(value[i]);
                    }
                } else if (operator === 'ncontains') {
                    if (!isTrue) {
                        const objVal = !utils.getObjFromDotStr(obj, target);
                        if (typeof objVal === 'undefined' && (typeof value === 'undefined' || value === '')) isTrue = true;
                        else if (objVal) isTrue = !objVal.includes(value[i]);
                    }
                } else if (operator === 'eq') isTrue = isTrue || utils.getObjFromDotStr(obj, target) === value[i];
                else if (operator === 'neq') isTrue = isTrue || utils.getObjFromDotStr(obj, target) !== value[i];
                else if (operator === 'startswith') {
                    if (!isTrue) {
                        const objVal = utils.getObjFromDotStr(obj, target);
                        if (typeof objVal === 'undefined' && (typeof value === 'undefined' || value === '')) isTrue = true;
                        else if (objVal) isTrue = objVal.startsWith(value[i]);
                    }
                } else if (operator === 'endswith') {
                    if (!isTrue) {
                        const objVal = utils.getObjFromDotStr(obj, target);
                        if (typeof objVal === 'undefined' && (typeof value === 'undefined' || value === '')) isTrue = true;
                        else if (objVal) isTrue = objVal.endsWith(value[i]);
                    }
                } else if (operator === 'gte') isTrue = isTrue || utils.getObjFromDotStr(obj, target) >= value[i];
                else if (operator === 'gt') isTrue = isTrue || utils.getObjFromDotStr(obj, target) > value[i];
                else if (operator === 'lte') isTrue = isTrue || utils.getObjFromDotStr(obj, target) <= value[i];
                else if (operator === 'lt') isTrue = isTrue || utils.getObjFromDotStr(obj, target) < value[i];
            }
        } else {
            if (operator === 'contains') {
                const objVal = utils.getObjFromDotStr(obj, target);
                if (typeof objVal === 'undefined' && (typeof value === 'undefined' || value === '')) isTrue = true;
                else if (objVal) isTrue = objVal.includes(value);
            } else if (operator === 'ncontains') {
                const objVal = utils.getObjFromDotStr(obj, target);
                if (typeof objVal === 'undefined' && (typeof value === 'undefined' || value === '')) isTrue = true;
                else if (objVal) isTrue = !objVal.includes(value);
            } else if (operator === 'eq') isTrue = utils.getObjFromDotStr(obj, target) === value;
            else if (operator === 'neq') isTrue = utils.getObjFromDotStr(obj, target) !== value;
            else if (operator === 'startswith') {
                const objVal = utils.getObjFromDotStr(obj, target);
                if (typeof objVal === 'undefined' && (typeof value === 'undefined' || value === '')) isTrue = true;
                else if (objVal) isTrue = objVal.startsWith(value);
            } else if (operator === 'endswith') {
                const objVal = utils.getObjFromDotStr(obj, target);
                if (typeof objVal === 'undefined' && (typeof value === 'undefined' || value === '')) isTrue = true;
                else if (objVal) isTrue = objVal.endsWith(value);
            } else if (operator === 'gte') isTrue = utils.getObjFromDotStr(obj, target) >= value;
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

/**
 * Allows you to know the validity of a basket type promotion
 * @param {ModelRules} rule the rule to be processed
 * @param {ModelUsers} user user who initiated the request
 * @param {ModelCart} cart the user's cart
 */
async function applyRecursiveRulesDiscount(rule, user, cart) {
    try {
        // fix in relation to the limitation of the fields of the user ...
        if (user) {
            user = await Users.findById(user._id);
        }
        const tCondition = [rule.operand];
        for (let j = 0; j < rule.conditions.length; j++) {
            const condition = rule.conditions[j];
            let target      = condition.target.replace('attr.', 'attributes.');
            let isTrue      = false;
            const value     = getValueFromCondition(condition);
            // colNames is the name of the collections (it is a variable in global)
            const tColNamesFound = colNames.filter((colName) => target.startsWith(`${colName}.`));
            // If a colNames is found in the target then it is not a product field
            if (tColNamesFound.length > 0) {
                if (target.startsWith('client.')) {
                    // If user does not exist (enter a promo code not connected)
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
                            // If the user is logged in we check if the field matches the value
                            isTrue = conditionOperator(condition.operator, user, target.replace('client.', ''), value);
                        }
                    }
                } else if (target.startsWith('categorie.') && cart) {
                    isTrue = await checkCartPrdInCategory(cart, target, value, isTrue, condition.operator);
                } else if (target.startsWith('panier.') && cart) {
                    target = target.replace('panier.', '');
                    isTrue = conditionOperator(condition.operator, {priceTotal: await calculateCartTotal(cart)}, target, value);
                }
            } else {
                // When conditions and other_rules are not in a "basket.qte_min" condition, we just have to check if
                // the conditions expressed in the rules exist in the basket
                // ie: we apply a discount if the cart contains items with the code: MYCODE and the slug: myslug/myproduct
                // if the product1 contains the code MYCODE and the product2 contains the slug myslug/myproduct
                // then the condition will be true because it is on all the products of the basket that these conditions are checked
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
                    if (cart && cart.items) {
                        tItems = cart.items.filter((product) => {
                            if (product.id) {
                                if (mongoose.Types.ObjectId.isValid(product.id)) {
                                    return conditionOperator(condition.operator, product.id, target, value);
                                }
                            }
                            return conditionOperator(condition.operator, product, target, value);
                        });
                    }
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
 * Allows you to know the validity of a basket type promotion
 * @param {ModelRules} rule the rule to be treated
 * @param {ModelUsers} user user who initiated the request
 * @param {ModelCart} cart the user's basket
 * @param {Boolean} isCart if true then we are in a "basket.qte_min" condition
 * @param {Boolean} isRoot Allows to know if we are at the root rule
 */
async function testRulesOnUser(rule, user, cart = undefined) {
    try {
        const tCondition = [rule.operand];
        // const validRules = [];
        for (let j = 0; j < rule.conditions.length; j++) {
            const condition = rule.conditions[j];
            const target    = condition.target.replace('attr.', 'attributes.');
            let isTrue      = true;
            const value     = getValueFromCondition(condition);
            // colNames is the name of the collections (it is a variable in global)
            const tColNamesFound = colNames.filter((colName) =>  target.startsWith(`${colName}.`));
            // If a colNames is found in the target then it is not a product field
            if (tColNamesFound.length > 0) {
                const key = target.split('.')[1];
                if (target.startsWith('client.')) {
                    // If user does not exist (enter a promo code not connected)
                    if (!user) {
                        isTrue = false;
                    } else {
                        // If the user is logged in we check if the field matches the value
                        isTrue = conditionOperator(condition.operator, user, key, value);
                        // if (isTrue) {
                        //     validRules.push(rule);
                        // }
                    }
                } else if (target.startsWith('categorie.') && cart !== undefined) {
                    isTrue = await checkCartPrdInCategory(cart, target, value, isTrue);
                }
            } else if (cart !== undefined) {
                // When conditions and other_rules are not in a "basket.qte_min" condition, we just have to check if
                // the conditions expressed in the rules exist in the basket
                // ex: we apply a discount if the cart contains items with the code: MYCODE and the slug: myslug/myproduct
                // if the product1 contains the code MYCODE and the product2 contains the slug myslug/myproduct
                // then the condition will be true because it is on all the products of the basket that these conditions are checked
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

async function applyRecursiveRules(_rules, query) {
    // For each rule
    for (let i = 0; i < _rules.length; i++) {
        const rule = _rules[i];

        // For each condition of the rule
        for (let j = 0; j < rule.conditions.length; j++) {
            const condition = rule.conditions[j];
            // We get the target field which contains the field to compare and the value field
            let target = condition.target;
            let value  = condition.value;
            if (condition.type === 'number') {
                value = Number(condition.value);
            } else if (condition.type === 'bool') {
                value = condition.value === 'true';
            }
            const queryConds = {};

            // Special treatment if it is an attribute (contains attr.)
            if (target.includes('attr.')) {
                target         = target.replace('attr.', '');
                const attrLang = target.split('.')[target.split('.').length - 2];
                const attrCode = target.split('.')[target.split('.').length - 1];
                // and test the value of this attribute
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
                // We get the "model" attribute in a product to know the index of the attribute in question
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
                // Operator management (expression transformation -> mongo operator)
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

/**
 *
 * @param {string} owner_type
 * @param {any[]} products
 * @param {string|undefined} optionPictoId
 * @returns
 */
// eslint-disable-next-line no-unused-vars
const execRules = async (owner_type, products = [], optionPictoId = undefined) => {
    const result = [];
    let logValue = '';
    // Is categorization in progress?
    if (inSegment[owner_type] === undefined || inSegment[owner_type] === false) {
        logValue = `${new Date()}) Start automatic categorization(${owner_type})`;
        console.log('\x1b[1m\x1b[33m', logValue, '\x1b[0m');
        result.push(logValue);
        inSegment[owner_type]   = true;
        const _rules            = await Rules.find(owner_type ? {owner_type} : {}).lean();
        const splittedRules     = {};
        const noConditionsRules = {};

        // Sort the rules according to their type (picto, category ...)
        for (let i = 0; i < _rules.length; i++) {
            if (splittedRules[_rules[i].owner_type] === undefined) {
                splittedRules[_rules[i].owner_type]     = [];
                noConditionsRules[_rules[i].owner_type] = [];
            }
            if (_rules[i].conditions.length > 0) {
                splittedRules[_rules[i].owner_type].push(_rules[i]);
            } else { // No (more) conditions
                noConditionsRules[_rules[i].owner_type].push(_rules[i]);
            }
        }

        const splittedRulesKeys = Object.keys(splittedRules);

        try {
            if (owner_type === 'picto') {await Products.updateMany({}, {$set: {pictos: []}});}

            for (let i = 0; i < splittedRulesKeys.length; i++) {
                // Apply rules
                for (let j = 0; j < splittedRules[splittedRulesKeys[i]].length; j++) {
                    // Segmentation Categories
                    if (splittedRulesKeys[i] === 'category') {
                        const oldCat = await Categories.findOne({_id: splittedRules[splittedRulesKeys[i]][j].owner_id}).lean();
                        const cat    = await Categories.findOneAndUpdate(
                            {_id: splittedRules[splittedRulesKeys[i]][j].owner_id},
                            {$set: {productsList: []}},
                            {new: true}
                        );
                        if (cat) {
                            const productsObj = await Products.find(
                                await applyRecursiveRules([splittedRules[splittedRulesKeys[i]][j]], {}),
                                {_id: 1}
                            ).lean();
                            const productsIds = productsObj.map((prd) => prd._id);

                            // Get product setted manually
                            if (oldCat) {
                                cat.productsList = oldCat.productsList.filter((ou) => ou.checked || productsIds.includes(ou.id));
                            }

                            // Transform the product list into an object whose key is the _id of the product
                            // we will be able to easily find the products
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

                            // Remove duplicates based on the product id
                            cat.productsList = cat.productsList.filter((thing, index, self) => index === self.findIndex((t) => t.id.toString() === thing.id.toString()));

                            await cat.save();
                        }
                    // Segementation picto
                    } else if (splittedRulesKeys[i] === 'picto') {
                        let picto;
                        if (!optionPictoId || optionPictoId === splittedRules[splittedRulesKeys[i]][j].owner_id) {
                            picto = await Pictos.findOne({
                                _id     : splittedRules[splittedRulesKeys[i]][j].owner_id,
                                enabled : true,
                                $and    : [{$or: [{startDate: undefined}, {startDate: {$lte: new Date(Date.now())}}]}, {$or: [{endDate: undefined}, {endDate: {$gte: new Date(Date.now())}}]}]});
                        } else {
                            picto = await Pictos.findOne({
                                _id     : optionPictoId,
                                enabled : true,
                                $and    : [{$or: [{startDate: undefined}, {startDate: {$lte: new Date(Date.now())}}]}, {$or: [{endDate: undefined}, {endDate: {$gte: new Date(Date.now())}}]}]});
                        }
                        if (picto) {
                            const productsObj = await Products.find(
                                await applyRecursiveRules([splittedRules[splittedRulesKeys[i]][j]], {}),
                                {_id: 1}
                            ).lean();
                            const productsIds = productsObj.map((prd) => prd._id);

                            const pictoData = {code: picto.code, image: picto.filename, pictoId: picto._id, title: picto.title, location: picto.location};
                            await Products.updateMany({_id: {$in: productsIds}, pictos: {$ne: pictoData}}, {$push: {pictos: pictoData}});
                        }
                    } else {
                        logValue = `=== owner_type(${splittedRulesKeys[i]}) unknown ===`;
                        console.warn(logValue);
                        result.push(logValue);
                    }
                }
                // For the NoConditions, unset values
                for (let j = 0; j < noConditionsRules[splittedRulesKeys[i]].length; j++) {
                    // No (more) conditions, so we remove all the products setted by the (removed) rules
                    if (splittedRulesKeys[i] === 'category') {
                        const cat = await Categories.findOne({_id: noConditionsRules[splittedRulesKeys[i]][j].owner_id});
                        if (cat) {
                            for (let k = 0; k < cat.productsList.length; k++) {
                                if (!cat.productsList[k].checked) {
                                    cat.productsList.splice(k, 1);
                                    k--;
                                }
                            }
                            await cat.save();
                        }
                    }
                }
            }

            inSegment[owner_type] = false;
            logValue              = `${new Date()}) End of automatic categorization(${owner_type})`;
            console.log('\x1b[1m\x1b[32m', logValue, '\x1b[0m');
            result.push(logValue);
        } catch (err) {
            inSegment[owner_type] = false;
            logValue              = `${new Date()}) End of automatic categorization(${owner_type})`;
            console.log('\x1b[1m\x1b[31m', logValue, '\x1b[0m');
            result.push(logValue);
            console.error(err);
            result.push(err);
        }
    } else {
        logValue = `${new Date()}) Automatic categorization(${owner_type}) already in progress`;
        console.log('\x1b[1m\x1b[33m', logValue, '\x1b[0m');
        result.push(logValue);
    }
    return result;
};

module.exports = {
    listRules,
    queryRule,
    testUser,
    setRule,
    deleteRule,
    execRules,
    applyRecursiveRules,
    applyRecursiveRulesDiscount
};

async function checkCartPrdInCategory(cart, target, value, isTrue, operator) {
    const key    = target.slice(target.indexOf('.') + 1);
    const _cat   = await Categories.findOne({[key]: value});
    let prdFound = false;

    if (_cat) {
        let i      = 0;
        const leni = cart.items.length;

        while (prdFound === false && i < leni) {
            const prd = _cat.productsList.find((_prd) => {
                // if items[i].id exist it's a Cart else items is an array of products
                if (cart.items[i].id) {
                    if (mongoose.Types.ObjectId.isValid(cart.items[i].id)) {
                        return _prd.id.toString() === cart.items[i].id.toString();
                    }
                    return _prd.id.toString() === cart.items[i].id._id.toString();
                }
                return _prd.id.toString() === cart.items[i]._id.toString();
            });
            if (prd) {
                prdFound = true;
            }
            i++;
        }
    }
    if ((prdFound && (['contains', 'eq']).includes(operator)) || (!prdFound && (['ncontains', 'neq']).includes(operator))) {
        isTrue = true;
    }
    return isTrue;
}

function getValueFromCondition(condition) {
    if (condition.type === 'number')  return Number(condition.value);
    if (condition.type === 'bool')  return condition.value === true;
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
