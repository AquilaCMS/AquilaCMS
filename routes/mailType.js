const {authentication, adminAuth} = require("../middleware/authentication");
const ServiceMailType             = require('../services/mailType');

module.exports = function (app) {
    app.get('/v2/mail_types', authentication, adminAuth, getMailTypes);
    app.put('/v2/mail_type', authentication, adminAuth, setMailType);
};

/**
 * Permet de recupérer les configurations des mails dans la collection mail
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getMailTypes(req, res, next) {
    try {
        const result = await ServiceMailType.getMailTypes();
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Permet de modifier une configuration d'un mail dans la collection mail
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function setMailType(req, res, next) {
    try {
        const result = await ServiceMailType.setMailType(req.body, req.body._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}