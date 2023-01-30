/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const QueryBuilder     = require('../utils/QueryBuilder');
const {Newsletters}    = require('../orm/models');
const restrictedFields = [];
const defaultFields    = [];
const queryBuilder     = new QueryBuilder(Newsletters, restrictedFields, defaultFields);

exports.getNewsletters = async function (PostBody) {
    return queryBuilder.find(PostBody, true);
};

exports.getNewsletter = async function (PostBody) {
    return queryBuilder.findOne(PostBody, true);
};

exports.getDistinctNewsletters = async function (PostBody) {
    const newsletterNames      = await Newsletters.find(PostBody.filter).distinct('segment.name').lean();
    const newsletterNamesCount = newsletterNames.length;
    const newsCount            = [];
    const datas                = newsletterNames.sort((a, b) => (PostBody.sort.reverse ? b - a : a - b)).slice((PostBody.page - 1) * PostBody.limit, PostBody.limit);

    for (const element of datas) {
        const nl = await queryBuilder.find({PostBody: {filter: {'segment.name': element}}}, true);
        newsCount.push({name: element, count: nl.count});
    }
    return {datas: newsCount, count: newsletterNamesCount};
};

exports.getNewsletterByEmail = async function (email) {
    return Newsletters.findOne({email}).lean();
};

/**
 * params :
 * "name": "test", // Segment name
 * "optin": true // true for subscription, false for unsubscription
 */
exports.setStatusNewsletterByEmail = async function (email, params) {
    // segment will be empty if no object match to the projection
    // There can only be one element returned with this projection
    // (even if segment[i].name is present more than once in this segment)
    const oNewsletter = await Newsletters.findOne(
        {email, 'segment.name': params.name},
        {email: 1, segment: {$elemMatch: {name: params.name}}}
    ).lean();
    // No segment exists
    if (!oNewsletter || !oNewsletter.segment.length) {
        const update = {name: params.name, optin: params.optin, date_subscribe: new Date()};
        return Newsletters.findOneAndUpdate({email}, {$push: {segment: update}}, {new: true, upsert: true});
    }
    return Newsletters.findOneAndUpdate({
        email
    }, {
        $set : {
            'segment.$[seg].name'             : params.name,
            'segment.$[seg].optin'            : params.optin,
            // Optin = false : unsubscribe the user
            'segment.$[seg].date_unsubscribe' : params.optin ? null : new Date()
        }
    }, {
        arrayFilters : [{'seg.name': params.name}],
        new          : true
    });
};
