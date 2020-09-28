const ServiceComponent = require('../services/component');

module.exports = function (app) {
    app.post('/v2/component/:componentName/:code', getComponent);
};

/**
 * POST /api/v2/component/{componentName}/{code}
 * @summary This is the summary
 * @tags Component
 * @param {string} componentName.path.required - componentName always start with "ns-"
 * @param {string} code.path.required - code
 * @param {string} authorization.header - authorization
 * @return {object} 200 - success response | test name | {
 * "coucou": "truc"
 * }
 * @return {object} 400 - Bad request response
 */
async function getComponent(req, res, next) {
    try {
        const {componentName, code} = req.params;
        const result                = await ServiceComponent.getComponent(componentName, code, req.headers.authorization);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
