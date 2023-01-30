/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const NSErrors = require('../utils/errors/NSErrors');

/**
 * Aggregate Reviews
 * @param {Object} body body
 */
const getAggregateReviews = async (body) => {
    const limit = body.limit || 12;
    if (!body.page) {
        body.page = 1;
    }
    const {Products}    = require('../orm/models');
    const reviewsUnwind = await Products.aggregate([{
        $match : body.filter
    }, {
        $project : {
            code            : 1,
            translation     : 1,
            'reviews.datas' : 1
        }
    }, {
        $unwind : {path: '$reviews.datas'}
    }, {$match: body.match}, {
        $sort : body.sortObj
    }, {
        $skip : (body.page - 1) * limit
    }, {
        $limit : limit
    }]);
    const tCount        = await Products.aggregate([{
        $match : body.filter
    }, {
        $unwind : {path: '$reviews.datas'}
    }, {$match: body.match}, {
        $count : 'count'
    }]);
    let count           = 0;
    if (tCount.length) {
        count = tCount[0].count;
    }
    return {datas: reviewsUnwind, count};
};

/**
 * Add a review in product.reviews.datas[],
 * recalculate the average of the product product.review.average,
 * increment the product.review.reviews_nb
 * @param {ObjectId} idProduct product id
 * @param {Object} review comment on item idProduct
 */
const setProductReview = async (idProduct, user, review, title, rate, lang, questions = [], ipClient = null) => {
    const {Products} = require('../orm/models');
    const product    = await Products.findById(idProduct);
    if (!product) {
        throw NSErrors.NotFound;
    }
    if (!idProduct || !review || !title || !rate) {
        throw NSErrors.InvalidRequest;
    }
    if (questions.length) {
        const foundNotRated = questions.find((question) => question.rate === 0).lean();
        if (foundNotRated) {
            throw NSErrors.NotFound;
        }
    }
    let name      = 'Anonymous';
    let id_client = null;
    if (user) {
        name                             = '';
        const {firstname, lastname, _id} = user;
        id_client                        = _id;
        if (firstname) name += firstname;
        if (lastname) name += ` ${lastname.trim().substring(0, 1)}.`;
    }
    const oReview = {
        title,
        review,
        rate,
        lang,
        name,
        id_client,
        visible   : false,
        verify    : false,
        ip_client : ipClient,
        questions
    };
    product.reviews.datas.push(oReview);
    if (product.reviews && product.reviews.datas) {
        // We calculate the average of the scores
        computeAverageRateAndCountReviews(product);
    }
    const newProduct = await product.save();
    return newProduct;
};

/**
 * Remove a specific review
 * @param {ObjectId} idProduct product's id
 * @param {ObjectId} idreview review's id
 */
const deleteProductReview = async (idProduct, idReview) => {
    if (!idProduct) {
        throw NSErrors.InvalidParameters;
    }
    if (!idReview) {
        throw NSErrors.InvalidParameters;
    }
    const {Products} = require('../orm/models');
    // Get the product in which the review is stored
    const product = await Products.findById(idProduct);
    if (product.reviews && product.reviews.datas) {
        // Get the index of this review in the reviews table of the product
        const indexReview = product.reviews.datas.findIndex((review) => review.id === idReview);
        if (indexReview > -1) {
            if (product.reviews.datas[indexReview].verify === true && product.reviews.datas[indexReview].visible === true) {
                product.reviews.reviews_nb--;
                product.reviews.average = 0;
            }
            // we delete it from the table
            product.reviews.datas.splice(indexReview, 1);
            return product.save();
        }
        throw NSErrors.ProductReviewNotFound;
    } else {
        throw NSErrors.ProductReviewNotFound;
    }
};

/**
 * We delete the reviews that are not visible and verify in the list passed in param
 * @param {Array<Products>} result Table of products
 */
const keepVisibleAndVerifyArray = async (result) => {
    for (let i = 0; i < result.datas.length; i++) {
        const product = result.datas[i];
        if (!product.reviews || !product.reviews.datas || !product.reviews.datas.length) {
            continue;
        }
        keepVisibleAndVerify(product);
    }
};

/**
 * We remove the reviews that are not visible and verified for this product
 * @param {Products} product Product
 */
const keepVisibleAndVerify = (product) => {
    for (let j = product.reviews.datas.length - 1; j >= 0; j--) {
        const {visible, verify} = product.reviews.datas[j];
        if (!visible || !verify) product.reviews.datas.splice(j, 1);
    }
};

/**
 * This function will compute the average rate for reviews
 */
const computeAverageRateAndCountReviews = async (product) => {
    if (!product.reviews || !product.reviews.datas || !product.reviews.datas.length) {
        return {average: 0, reviews_nb: 0};
    }
    let sum = 0;
    // Allows for each question to define if it has been set to true, if yes then question.reviews_nb will be = a 0 and
    // we will increment its number for each product containing this question
    const oSumQuestion = {};
    let count          = 0;
    // We count each visible and verified review
    for (let i = 0, l = product.reviews.datas.length; i < l; i++) {
        if (!product.reviews.datas[i].visible || !product.reviews.datas[i].verify) continue;
        sum += product.reviews.datas[i].rate;
        count++;
        if (!product.reviews.questions || !product.reviews.questions.length
            || !product.reviews.datas[i].questions || !product.reviews.datas[i].questions.length) {
            continue;
        }

        // We will count the total number of questions x existing in the visible and verified reviews
        for (let j = 0; j < product.reviews.datas[i].questions.length; j++) {
            const question = product.reviews.datas[i].questions[j];
            // For each product.reviews.datas[i].questions[j] we count the number of occurrences in order not to have
            // inconsistency in case of comment deletion
            if (!oSumQuestion[question.idQuestion]) {
                oSumQuestion[question.idQuestion] = {reviews_nb: 0, sum: 0};
            }
            oSumQuestion[question.idQuestion].reviews_nb += 1;
            oSumQuestion[question.idQuestion].sum        += question.rate;
        }
    }
    if (product.reviews.questions && product.reviews.questions.length) {
        for (let i = 0; i < product.reviews.questions.length; i++) {
            const globalQuestion = product.reviews.questions[i];
            if (!oSumQuestion[globalQuestion.idQuestion.toString()]) continue;
            const {reviews_nb, sum} = oSumQuestion[globalQuestion.idQuestion];
            globalQuestion.average  = Number((sum / reviews_nb).aqlRound(1));
        }
    }
    product.reviews.average    = 0;
    product.reviews.reviews_nb = 0;
    if (count) {
        product.reviews.average    = Number((sum / count).aqlRound(1));
        product.reviews.reviews_nb = count;
    }
};

module.exports = {
    getAggregateReviews,
    setProductReview,
    deleteProductReview,
    keepVisibleAndVerifyArray,
    keepVisibleAndVerify,
    computeAverageRateAndCountReviews
};