const {middlewareServer}          = require('../middleware');
const {authentication, adminAuth} = require("../middleware/authentication");
const ServicesRules               = require('../services/rules');

module.exports = function (app) {
    app.post('/v2/rules', listRules);
    app.post('/v2/rule', queryRule);
    app.put('/v2/rule', authentication, adminAuth, setRule);
    app.delete('/v2/rule/:_id', authentication, adminAuth, deleteRule);
    app.post("/v2/rules/testUser", authentication, adminAuth, testUser);

    // Deprecated
    app.post("/rules", middlewareServer.deprecatedRoute, authentication, adminAuth, getRules);
    app.post("/rule", middlewareServer.deprecatedRoute, authentication, adminAuth, getRule);
    app.put("/rule", middlewareServer.deprecatedRoute, authentication, adminAuth, setRule);
    app.delete("/rule/:_id", middlewareServer.deprecatedRoute, authentication, adminAuth, deleteRule);
    // app.get("/v2/rule/stopExecOnError/:owner_type", authentication, adminAuth, stopExecOnError);
};

async function listRules(req, res, next) {
    try {
        return res.json(await ServicesRules.listRules(req.body.PostBody));
    } catch (error) {
        next(error);
    }
}

async function queryRule(req, res, next) {
    try {
        return res.json(await ServicesRules.queryRule(req.body.PostBody));
    } catch (error) {
        next(error);
    }
}

async function deleteRule(req, res, next) {
    try {
        return res.json(await ServicesRules.deleteRule(req.params._id));
    } catch (error) {
        return next(error);
    }
}

async function setRule(req, res, next) {
    try {
        return res.json(await ServicesRules.setRule(req.body));
    } catch (error) {
        return next(error);
    }
}

async function testUser(req, res, next) {
    try {
        const result = await ServicesRules.testUser(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
 * @deprecated
 */
/* function stopExecOnError(req, res, next) {
    try {
        ServicesRules.stopExecOnError(req.params.owner_type);
        res.end();
    } catch (err) {
        return next(err);
    }
} */

/**
 * Récupère toutes les règles
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function getRules(req, res, next) {
    try {
        const result = await ServicesRules.getRules(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function getRule(req, res, next) {
    try {
        const result = await ServicesRules.getRule(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}