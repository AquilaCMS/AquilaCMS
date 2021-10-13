/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/* eslint-disable no-extend-native */

/**
 * Polluting the prototype can be considered bad if it is done from a module, which is not our case here https://stackoverflow.com/a/29494612
 * @param {*} places
 * @returns
 */

Number.prototype.aqlRound = function (places = 2) {
    return +(`${Math.round(`${this}e+${places}`)}e-${places}`);
};