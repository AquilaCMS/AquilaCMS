const {authentication, adminAuth} = require('../middleware/authentication');
const updateService               = require('../services/update');

module.exports = function (app) {
    app.get('/v2/update/verifying', authentication, adminAuth, verifyingUpdate);
    app.get('/v2/update', authentication, adminAuth, update);
};

/*
* Check if update is available
*/
async function verifyingUpdate(req, res, next) {
    try {
        res.send(await updateService.verifyingUpdate());
    } catch (err) {
        return next(err);
    }
}

/*
* Updating Aquila
*/
async function update(req, res, next) {
    try {
        res.send(await updateService.update());
    } catch (err) {
        return next(err);
    }
}
