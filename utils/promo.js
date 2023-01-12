/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/**
 * Allows you to transform our condition array into a JS condition that will be evaluated
 * @param {*} conditions
 * @param {*} str
 */
const createIfStatement = (conditions, str = '( ') => {
    let operator;
    // if we have a condition after an array we must put the operator before the condition
    let afterArray = false;
    if (conditions[0] === 'NONE') {
        return '(true)';
    }
    for (let i = 0; i < conditions.length; i++) {
        const condition = conditions[i];
        if (condition instanceof Array) {
            if (conditions.length && conditions[i - 1] instanceof Array) {
                str += operator;
            }
            str += createIfStatement(condition, '( ');
        } else {
            // the condition can be either "AND", "OR" or a boolean
            if (condition === 'ET' || condition === 'OU') {
                // If the preceding conditions element is an array then we must add the operator after the parenthesis
                // (each end of parenthesis corresponds to the end of a condition array) ex: if (true && (false || true) && true)
                if (conditions.length && conditions[i - 1] instanceof Array) {
                    afterArray = true;
                }
                operator = condition === 'ET' ? ' && ' : ' || ';
            } else {
                // We put the operator before the condition and after (if the conditions are met)
                if (afterArray) {
                    str       += operator;
                    str       += condition;
                    afterArray = false;
                } else {
                    // We put the operator after the condition
                    str += condition;
                }
                // If the array contains less than 3 elements (the operator and a boolean)
                // the condition below makes it possible not to have this kind of problem: if (true || true &&)
                if (conditions.length > 2 && conditions.length - 1 !== i) {
                    str += operator;
                }
            }
        }
    }
    str += ') ';
    return str;
};

module.exports = {
    createIfStatement
};