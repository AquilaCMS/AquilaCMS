/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const Shipments          = require('./shipments');
const {RelayPointSchema} = require('../schemas');

module.exports = Shipments.discriminator('RELAY_POINT', RelayPointSchema, {discriminatorKey: 'type'});