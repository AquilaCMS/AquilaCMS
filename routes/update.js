/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuthRight} = require('../middleware/authentication');
const updateService    = require('../services/update');

module.exports = function (app) {
    app.get('/v2/update/verifying', adminAuthRight('update'), verifyingUpdate);
    app.get('/v2/update', adminAuthRight('update'), update);
    app.get('/v2/checkChanges', adminAuthRight('update'), checkChanges);
    app.get('/v2/checkGithub', adminAuthRight('update'), checkGithub);
    app.post('/v2/updateGithub', adminAuthRight('update'), updateGithub);
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
* Updating Aquila with Zip
*/
async function update(req, res, next) {
    try {
        res.send(await updateService.update());
    } catch (err) {
        return next(err);
    }
}

/*
* Updating Aquila with Git
*/
async function checkChanges(req, res, next) {
    try {
        res.send(await updateService.checkChanges());
    } catch (err) {
        return next(err);
    }
}

/*
* Check if github connection exist
*/
async function checkGithub(req, res, next) {
    try {
        res.send(await updateService.checkGithub());
    } catch (err) {
        return next(err);
    }
}

/*
* update aquila with Github
*/
async function updateGithub(req, res, next) {
    try {
        res.send(await updateService.updateGithub(req.body));
    } catch (err) {
        return next(err);
    }
}
