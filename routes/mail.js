const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceMail                 = require('../services/mail');

module.exports = function (app) {
    app.get('/v2/mails', authentication, adminAuth, getMails);
    app.get('/v2/mail/:_id', authentication, adminAuth, getMail);
    app.get('/v2/mail/activation/account/sent/:user_id/:lang?', authentication, adminAuth, sendMailActivationAccount);
    app.put('/v2/mail', authentication, adminAuth, setMail);
    app.put('/v2/mail/removePdf', authentication, adminAuth, removePdf);
    app.post('/v2/mail/form/:lang?', sendContact);
    app.delete('/v2/mail/:_id', authentication, adminAuth, deleteMail);
    app.post('/v2/mail/test', authentication, adminAuth, sendTestEmail);
};

async function sendTestEmail(req, res, next) {
    try {
        let result;
        if (req.body.values === 'Email Test') {
            result = await ServiceMail.sendMailTestConfig(req.body.mail, req.body.values, req.body.lang);
        } else {
            result = await ServiceMail.sendMailTest(req.body.mail, req.body.values, req.body.lang);
        }
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function removePdf(req, res, next) {
    try {
        const result = await ServiceMail.removePdf(req.body.mail, req.body.path);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Permet de recupérer les mails dans la collection mail
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getMails(req, res, next) {
    try {
        const result = await ServiceMail.getMails();
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Permet de récupérer un mail en fonction de son _id
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getMail(req, res, next) {
    try {
        const result = await ServiceMail.getMail(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
async function sendMailActivationAccount(req, res, next) {
    try {
        const {user_id, lang}  = req.params;
        const result           = await ServiceMail.sendMailActivationAccount(user_id, lang);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Permet de modifier un mail dans la collection mail
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function setMail(req, res, next) {
    try {
        const result = await ServiceMail.setMail(req.body, req.body._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Supprime le mail dont l'_id est passé en parametre
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function deleteMail(req, res, next) {
    try {
        const result = await ServiceMail.deleteMail(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Envoyer les informations d'un formulaire de contact par mail
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function sendContact(req, res, next) {
    try {
        const result = await ServiceMail.sendContact(req.body, req.params.lang);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
