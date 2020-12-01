const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceSystem               = require('../services/system');

module.exports = function (app) {
    app.post('/v2/log/setlinks', authentication, adminAuth, setLinks);
    app.get('/v2/log/links', authentication, adminAuth, getLinks);
    app.get('/v2/log/file', authentication, adminAuth, getFiles);
};

async function setLinks(req, res, next) {
    try {
        await ServiceSystem.setConfigFile(req.body);
        return res.send('success');
    } catch (err) {
        return next(err);
    }
}

const getLinks = async (req, res, next) => {
    try {
        return res.json(await ServiceSystem.getConfigFile());
    } catch (err) {
        return next(err);
    }
};

const getFiles = async (req, res, next) => {
    try {
        return res.json(await ServiceSystem.getFile(req.body));
    } catch (err) {
        return next(err);
    }
};
