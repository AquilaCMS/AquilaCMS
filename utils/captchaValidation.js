const aquilaEvents = require("./aquilaEvents");

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
