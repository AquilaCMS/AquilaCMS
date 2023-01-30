/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {authentication} = require('../middleware/authentication');
const seoServices      = require('../services/seo');

module.exports = function (app) {
    app.post('/v2/seo/genSitemap', authentication, genSitemap);
    app.get('/v2/seo/isDemoMode', isDemoMode);
};

async function genSitemap(req, res, next) {
    try {
        await seoServices.genSitemap();
        return res.status(200).json({
            message : 'SITEMAP_GENERATE_SUCCESS'
        });
    } catch (err) {
        return next(err);
    }
}

/*
* Return true if the site is in demoMode
*/
async function isDemoMode(req, res, next) {
    try {
        res.send(await seoServices.isDemoMode());
    } catch (err) {
        return next(err);
    }
}
