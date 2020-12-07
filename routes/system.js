const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceSystem               = require('../services/system');

module.exports = function (app) {
    app.post('/v2/log/setFiles', authentication, adminAuth, setFiles);
    app.get('/v2/log/file', authentication, adminAuth, getFiles);
};

async function setFiles(req, res, next) {
    try {
        await ServiceSystem.setFilesInAquila(req.body);
        return res.send('success');
    } catch (err) {
        return next(err);
    }
}

const getFiles = async (req, res, next) => {
    try {
        return res.json(await ServiceSystem.getFile(req.query));
    } catch (err) {
        return next(err);
    }
};
