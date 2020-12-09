const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceSystem               = require('../services/system');

module.exports = function (app) {
    app.post('/v2/log/setFiles', authentication, adminAuth, setFileContent);
    app.get('/v2/log/file', authentication, adminAuth, getFileContent);
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
