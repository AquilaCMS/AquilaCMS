/**
 * Permet de transformer notre tableau de condition en une condition JS qui sera évalué
 * @param {*} conditions
 * @param {*} str
 */
const createIfStatement = (conditions, str = '( ') => {
    let operator;
    // si on a une condition après un array nous devons mettre l'opérateur avant la condition
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
            // la condition peut être soit "ET", "OU" ou un boolean
            if (condition === 'ET' || condition === 'OU') {
                // Si l'element conditions précédent est un tableau alors nous devons rajouter l'opérateur après la parenthése
                // (chaque fin de parenthès correspond a la fin d'un tableau de condition) ex: if( true && ( false || true) && true )
                if (conditions.length && conditions[i - 1] instanceof Array) {
                    afterArray = true;
                }
                operator = condition === 'ET' ? ' && ' : ' || ';
            } else {
                // On met l'operateur avant la condition et après (si les conditions sont respectées)
                if (afterArray) {
                    str += operator;
                    str += condition;
                    afterArray = false;
                } else {
                    // On met l'opérateur après la condition
                    str += condition;
                }
                // Si le tableau contient moins de 3 elements (l'opérateur et un boolean)
                // la condition ci-dessous permet de ne pas avoir ce genre de probleme : if(true || true &&)
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