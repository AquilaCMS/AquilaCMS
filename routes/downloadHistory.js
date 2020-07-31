const SercivesDownloadHistory     = require('../services/downloadHistory');
const {authentication, adminAuth} = require('../middleware/authentication');

module.exports = function (app) {
    app.post('/v2/downloadHistory', authentication, adminAuth, getHistory);
    app.put('/v2/downloadHistory', authentication, adminAuth, addToHistory);
};

/**
 * Récupèration de l'hisorique des telechargements enregistré (ou filtrer via le PostBody)
 */
async function getHistory(req, res, next) {
    try {
        return res.json(await SercivesDownloadHistory.getHistory(req.body.PostBody));
    } catch (error) {
        return next(error);
    }
}

async function addToHistory(req, res, next) {
    try {
        return res.json(await SercivesDownloadHistory.addToHistory(req.body.user, req.body.product));
    } catch (error) {
        return next(error);
    }
}