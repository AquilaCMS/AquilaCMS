/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuthRight} = require('../middleware/authentication');
const ServiceSystem    = require('../services/system');

module.exports = function (app) {
    app.post('/v2/system/log/file', adminAuthRight('system'), getLogsContent);
};

const getLogsContent = async (req, res, next) => {
    try {
        const fileName = req.body.name;
        const page     = req.body.pageNbr;
        return res.json(await ServiceSystem.getLogsContent(fileName, page));
    } catch (err) {
        return next(err);
    }
};