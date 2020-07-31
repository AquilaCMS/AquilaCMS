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
    const {Products} = require('../orm/models');
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
    const tCount = await Products.aggregate([{
        $match : body.filter
    }, {
        $unwind : {path: '$reviews.datas'}
    }, {$match: body.match}, {
        $count : 'count'
    }]);
    let count = 0;
    if (tCount.length) {
        count = tCount[0].count;
    }
    return {datas: reviewsUnwind, count};
};

/**
 * Permet d'ajouter une review dans product.reviews.datas[],
 * de recalculer la moyenne du produit product.review.average,
 * d'incrémenter le product.review.reviews_nb.
 * @param {ObjectId} idProduct id du produit
 * @param {Object} review commentaire sur l'article idProduct
 */
const setProductReview = async (idProduct, user = null, review, title, rate, lang, questions = [], ipClient = null) => {
    const {Products} = require('../orm/models');
    const product = await Products.findById(idProduct);
    if (!product) {
        throw NSErrors.NotFound;
    }
    if (!idProduct || !review || !title || !rate) {
        throw NSErrors.InvalidRequest;
    }
    if (questions.length) {
        const foundNotRated = questions.find((question) => question.rate === 0);
        if (foundNotRated) {
            throw NSErrors.NotFound;
        }
    }
    let name = 'Anonymous';
    let id_client = null;
    if (user) {
        name = '';
        const {firstname, lastname, _id} = user.info;
        id_client = _id;
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
        // On calcule la moyenne des notes
        computeAverageRateAndCountReviews(product);
    }
    const newProduct = await product.save();
    return newProduct;
};

/**
 * Remove a specific review
 * @param {ObjectId} idProduct id du produit
 * @param {ObjectId} idreview id de la review
 */
const deleteProductReview = async (idProduct, idReview) => {
    if (!idProduct) {
        throw NSErrors.InvalidParameters;
    }
    if (!idReview) {
        throw NSErrors.InvalidParameters;
    }
    const {Products} = require('../orm/models');
    // on recupere le produit dans lequel la review est stokée
    const product = await Products.findById(idProduct);
    if (product.reviews && product.reviews.datas) {
        // on recupere l'index de cette reviews dans le tableau des reviews du produit
        const indexReview = product.reviews.datas.findIndex((review) => review.id === idReview);
        if (indexReview > -1) {
            if (product.reviews.datas[indexReview].verify === true && product.reviews.datas[indexReview].visible === true) {
                product.reviews.reviews_nb--;
                product.reviews.average = 0;
            }
            // on la delete du tableau
            product.reviews.datas.splice(indexReview, 1);
            return product.save();
        }
        throw NSErrors.ProductReviewNotFound;
    } else {
        throw NSErrors.ProductReviewNotFound;
    }
};

/**
 * On supprime les reviews qui ne sont pas visible et verify dans la liste passé en param
 * @param {Array<Products>} result Tableau de produits
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
 * On supprime les reviews qui ne sont pas visible et verify pour ce produit
 * @param {Products} product Produit
 */
const keepVisibleAndVerify = async (product) => {
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
    // Permet pour chaque question de définir si elle a été set a true, si oui alors question.reviews_nb sera = a 0 et
    // on incrémentera son nombre pour chaque produit contenant cette question
    const oSumQuestion = {};
    let count = 0;
    // On compte chaque review visible et verify
    for (let i = 0, l = product.reviews.datas.length; i < l; i++) {
        if (!product.reviews.datas[i].visible || !product.reviews.datas[i].verify) continue;
        sum += product.reviews.datas[i].rate;
        count++;
        if (!product.reviews.questions || !product.reviews.questions.length
            || !product.reviews.datas[i].questions || !product.reviews.datas[i].questions.length) {
            continue;
        }

        // On va comtper le nombre total de question x existant dans les reviews visible et verify
        for (let j = 0; j < product.reviews.datas[i].questions.length; j++) {
            const question = product.reviews.datas[i].questions[j];
            // Pour chaque product.reviews.datas[i].questions[j] on compte le nombre d'occurence afin de ne pas avoir
            // d'incohérence en cas de suppression de commentaire
            if (!oSumQuestion[question.idQuestion]) {
                oSumQuestion[question.idQuestion] = {reviews_nb: 0, sum: 0};
            }
            oSumQuestion[question.idQuestion].reviews_nb += 1;
            oSumQuestion[question.idQuestion].sum += question.rate;
        }
    }
    if (product.reviews.questions && product.reviews.questions.length) {
        for (let i = 0; i < product.reviews.questions.length; i++) {
            const globalQuestion = product.reviews.questions[i];
            if (!oSumQuestion[globalQuestion.idQuestion.toString()]) continue;
            const {reviews_nb, sum} = oSumQuestion[globalQuestion.idQuestion];
            globalQuestion.average = Number((sum / reviews_nb).toFixed(1));
        }
    }
    product.reviews.average = 0;
    product.reviews.reviews_nb = 0;
    if (count) {
        product.reviews.average = Number((sum / count).toFixed(1));
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