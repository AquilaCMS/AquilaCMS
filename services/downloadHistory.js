/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {DownloadHistory} = require('../orm/models');
const QueryBuilder      = require('../utils/QueryBuilder');
const NSErrors          = require('../utils/errors/NSErrors');

const restrictedFields = [];
const defaultFields    = ['user', 'product'];
const queryBuilder     = new QueryBuilder(DownloadHistory, restrictedFields, defaultFields);

const getHistory = async (PostBody) => queryBuilder.find(PostBody, true);

const addToHistory = async (user, product) => {
    if (!user || !product) throw NSErrors.InvalidParameters;
    const existingHistory = await DownloadHistory.findOne({$and: [{'user.email': user.email}, {'product.code': product.code}]}).lean();
    if (existingHistory) {
        return DownloadHistory.findOneAndUpdate({$and: [{'user.email': user.email}, {'product.code': product.code}]}, {$inc: {countDownloads: 1}, lastDownloadDate: new Date()});
    }
    return DownloadHistory.create({
        user,
        product,
        firstDownloadDate : new Date(),
        lastDownloadDate  : new Date(),
        countDownloads    : 1
    });
};

module.exports = {
    getHistory,
    addToHistory
};