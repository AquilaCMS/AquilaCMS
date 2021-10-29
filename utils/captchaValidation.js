/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {aquilaEvents} = require('aql-utils');

module.exports = (req, res, next) => {
    // TODO add in config something who indicate that a captcha has been activated
    if (req.body.captchaTokenValidation) {
        const result = aquilaEvents.emit('captchaValidation', req.body['g-recaptcha-response']);
        console.log('eventEmitter :', result);
        aquilaEvents.on('captchaValidationResult', (err, response) => {
            if (err) throw response;
            return next();
        });
    } else {
        next();
    }
};
