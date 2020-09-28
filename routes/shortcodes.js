const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceShortcodes           = require('../services/shortcodes');

module.exports = function (app) {
    app.get('/v2/shortcodes', authentication, adminAuth, getShortcodes);
};

/**
 * Retourne les shortcodes
 */
async function getShortcodes(req, res, next) {
    try {
        const result = await ServiceShortcodes.getShortcodes();
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
