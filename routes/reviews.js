const {authentication, adminAuth} = require("../middleware/authentication");
const {getDecodedToken} = require('../services/auth');
const ServiceReviews = require("../services/reviews");

module.exports = function (app) {
    app.post('/v2/product/reviews/aggregate', getAggregateReviews);
    app.put("/v2/product/:id/review", setProductReview);
    app.delete("/v2/product/:id/review/:idreview", authentication, adminAuth, deleteProductReview);
};

/**
 * Permet de recupérer les reviews dans des documents séparées
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
 * Fonction pour d'ajouter une review dans product.reviews.datas
 */
const setProductReview = async (req, res, next) => {
    // On ajoute le produit
    try {
        const {review, title, rate, lang, questions} = req.body;
        let user = null;
        if (req.headers && req.headers.authorization) {
            user = getDecodedToken(req.headers.authorization);
        }
        const ipClient = req.header('x-forwarded-for') || req.connection.remoteAddress;
        const result   = await ServiceReviews.setProductReview(req.params.id, user, review, title, rate, lang, questions, ipClient);
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