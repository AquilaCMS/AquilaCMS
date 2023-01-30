/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/**
 * @typedef languages
 * @property {string} code
 * @property {string} name
 * @property {string} img
 * @property {number} position default: 2
 * @property {boolean} defaultLanguage default: false
 * @property {string} status default: invisible
 */

const mongoose          = require('mongoose');
const {LanguagesSchema} = require('../schemas');

module.exports = mongoose.model('languages', LanguagesSchema);