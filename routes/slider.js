const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceSlider               = require('../services/slider');

module.exports = function (app) {
    app.post('/v2/sliders', getSliders);
    app.post('/v2/slider', getSlider);
    app.post('/v2/slider/:id', getSliderById);
    app.put('/v2/slider/:id?', authentication, adminAuth, setSlider);
    app.delete('/v2/slider/:id', authentication, adminAuth, deleteSlider);
    app.delete('/v2/slider/:_id/:_id_item', authentication, adminAuth, deleteItemSlider);
};

/**
 * Fonction retournant un listing de produits
 */
async function getSliders(req, res, next) {
    try {
        const result = await ServiceSlider.getSliders(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction retournant un slider en fonction de son id
 */
async function getSliderById(req, res, next) {
    try {
        const result = await ServiceSlider.getSliderById(req.params.id, req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction retournant un slider en fonction des parametres du filter du queryBuilder
 */
async function getSlider(req, res, next) {
    try {
        const result = await ServiceSlider.getSlider(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction pour ajouter ou mettre à jour un slider
 */
async function setSlider(req, res, next) {
    // On ajoute le slider
    try {
        let result;
        if (req.body._id) {
            // On update le slider
            result = await ServiceSlider.setSlider(req);
        } else {
            // Création du slider
            result = await ServiceSlider.createSlider(req);
        }
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction supprimant un slider
 */
async function deleteSlider(req, res, next) {
    try {
        await ServiceSlider.deleteSlider(req);
        return res.json({status: true});
    } catch (error) {
        return next(error);
    }
}

async function deleteItemSlider(req, res, next) {
    try {
        const result = await ServiceSlider.deleteItemSlider(req.params._id, req.params._id_item);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
