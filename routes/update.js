/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

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
