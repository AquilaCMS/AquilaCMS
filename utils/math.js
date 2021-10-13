/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/**
 * This is the function recommended by this article https://www.delftstack.com/fr/howto/javascript/javascript-round-to-2-decimal-places/
 * We find it notably in this discussion https://stackoverflow.com/questions/11832914/how-to-round-to-at-most-2-decimal-places-if-necessary
 * @param {number} num
 * @returns {number}
 */
const aqlRound = (num, places = 2, addingTrailingZeros = true) => {
    let roundNum = +(`${Math.round(`${num}e+${places}`)}e-${places}`);
    if (places !== 0 && addingTrailingZeros) {
        roundNum        = roundNum.toString();
        let intPart     = roundNum;
        let decimalPart = '';

        // if we have a decimal number we split it into two parts
        if (roundNum.includes('.')) {
            roundNum    = roundNum.split('.');
            intPart     = roundNum[0];
            decimalPart = roundNum[1];
        }

        // if the size of the decimal part is not equal to the number of digits after the decimal point given in parameter, we add the missing zeros
        if (decimalPart.length !== places) {
            const numOfMissingZero = places - decimalPart.length;
            decimalPart            = decimalPart.padEnd(numOfMissingZero + decimalPart.length, 0);
        }
        roundNum = `${intPart}.${decimalPart}`;
    }
    return roundNum;
};

module.exports = {
    aqlRound
};