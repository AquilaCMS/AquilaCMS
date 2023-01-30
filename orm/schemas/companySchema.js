/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const CompanySchema = new Schema({
    name        : String,
    siret       : String,
    intracom    : String,
    address     : String,
    postal_code : String,
    town        : String,
    country     : String,
    contact     : {
        first_name : String,
        last_name  : String,
        email      : String,
        phone      : String
    }
}, {
    id : false
});

module.exports = CompanySchema;