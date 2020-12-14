const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceSystem               = require('../services/system');

module.exports = function (app) {
    app.post('/v2/system/log/setFiles', authentication, adminAuth, setFileContent);
    app.get('/v2/system/log/file', authentication, adminAuth, getFileContent);
    app.get('/v2/system/next/get', authentication, adminAuth, getNextVersion);
    app.post('/v2/system/next/change', authentication, adminAuth, changeNextVersion);
};

async function setFileContent(req, res, next) {
    try {
        const {name} = req.body;
        await ServiceSystem.setFilesInAquila(name);
        return res.send('success');
    } catch (err) {
        return next(err);
    }
}

const getFileContent = async (req, res, next) => {
    try {
        const {name} = req.query;
        return res.json(await ServiceSystem.getFileContent(name));
    } catch (err) {
        return next(err);
    }
};

/**
 * GET /api/config/next
 * @tags Configuration
 */
const getNextVersion = async (req, res, next) => {
    try {
        const datas = await ServiceSystem.getNextVersionService();
        return res.json({datas});
    } catch (err) {
        return next(err);
    }
};

/**
 * POST /api/config/next
 * @tags Configuration
 */
const changeNextVersion = async (req, res, next) => {
    try {
        await ServiceSystem.changeNextVersionService(req.body);
        res.end();
    } catch (err) {
        return next(err);
    }
};