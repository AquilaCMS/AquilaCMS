/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {Orders, PaymentMethods} = require('../orm/models');
const QueryBuilder             = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = ['_id', 'active', 'isDeferred', 'sort', 'code', 'translation', 'inCartVisible'];
const queryBuilder     = new QueryBuilder(PaymentMethods, restrictedFields, defaultFields);

exports.getOrdersPayments = async function (postBody) {
    postBody.limit = postBody.limit || 12;
    if (!postBody.page) {
        postBody.page = 1;
    }

    const allPayments = await Orders.aggregate([{
        $match : postBody.filter
    }, {
        $project : {
            _id      : 1,
            number   : 1,
            customer : 1,
            payment  : 1
        }
    }, {
        $unwind : {path: '$payment'}
    }, {$match: postBody.filter}, { // postBody.match
        $sort : postBody.sort
    }, {
        $skip : (postBody.page - 1) * postBody.limit
    }, {
        $limit : postBody.limit
    }]);

    const tCount = await Orders.aggregate([{
        $match : postBody.filter
    }, {
        $unwind : {path: '$payment'}
    }, {$match: postBody.filter}, { // postBody.match
        $count : 'count'
    }]);
    let count    = 0;
    if (tCount.length) {
        count = tCount[0].count;
    }

    return {datas: allPayments, count};
};

/**
 * @description retourne les methodes de payment
 */
exports.getPaymentMethods = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

/**
 * @description retourne les methodes de payment
 */
exports.getPaymentMethod = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};

/**
 * @description sauvegarde la methode de payment
 */

exports.savePaymentMethod = async function (pm) {
    if (pm._id) {
        await PaymentMethods.updateOne({_id: pm._id}, pm);
        return pm;
    }
    return PaymentMethods.ceate(pm);
};

exports.deletePaymentMethod = async function (_id) {
    return PaymentMethods.findOneAndDelete({_id});
};