/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuthRight} = require('../middleware/authentication');
const ServiceReviews   = require('../services/reviews');

module.exports = function (app) {
    app.post('/v2/product/reviews/aggregate', adminAuthRight('reviews'), getAggregateReviews);
    app.put('/v2/product/:id/review', setProductReview);
    app.delete('/v2/product/:id/review/:idreview', adminAuthRight('reviews'), deleteProductReview);
};

/**
 * Allows you to retrieve reviews in separate documents
 */
async function getAggregateReviews(req, res, next) {
    try {
        const result = await ServiceReviews.getAggregateReviews(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Function to add a review in product.reviews.datas
 */
const setProductReview = async (req, res, next) => {
    // We add the product
    try {
        const {review, title, rate, lang, questions} = req.body;

        const ipClient = req.header('x-forwarded-for') || req.connection.remoteAddress;
        const result   = await ServiceReviews.setProductReview(req.params.id, req.info, review, title, rate, lang, questions, ipClient);
        return res.status(200).json(result);
    } catch (error) {
        return next(error);
    }
};

/**
 * Remove a specific review
 */
async function deleteProductReview(req, res, next) {
    try {
        const result = await ServiceReviews.deleteProductReview(req.params.id, req.params.idreview);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}