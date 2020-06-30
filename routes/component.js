const ServiceComponent = require('../services/component');

module.exports = function (app) {
    app.post('/v2/component/:componentName/:code', getComponent);
};

async function getComponent(req, res, next) {
    try {
        const result = await ServiceComponent.getComponent(req.params.componentName, req.params.code, req.headers.authorization);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
