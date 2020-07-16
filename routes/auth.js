const {
    login,
    IsAuthenticate
}                   = require("../services/auth");
const {
    authentication,
    adminAuth,
    generateJWTToken
}                   = require("../middleware/authentication");
const {middlewareServer} = require('../middleware');
const NSErrors      = require("../utils/errors/NSErrors");

module.exports = function (app) {
    app.post('/v2/auth/login/:from?', login);
    app.get('/v2/auth/isauthenticated', authentication, IsAuthenticate);
    app.get('/auth/logout', logout);
    app.get('/v2/auth/logout', logout);
    app.post("/v2/auth/logout/admin", logoutAdmin);

    app.post('/v2/auth/loginAdminAsClient', authentication, loginAdminAsClient);

    // Deprecied
    app.get("/isauthenticated", middlewareServer.deprecatedRoute, authentication, adminAuth, IsAuthenticate);
    app.get('/v2/logout', middlewareServer.deprecatedRoute, logout);
    app.get('/auth/logout', middlewareServer.deprecatedRoute, logout);
    app.post("/login", middlewareServer.deprecatedRoute, login);
    app.post('/auth/login', middlewareServer.deprecatedRoute, login);
    app.get('/auth/isauthenticated', middlewareServer.deprecatedRoute, authentication, IsAuthenticate);
    app.get("/isauthenticated", middlewareServer.deprecatedRoute, authentication, adminAuth, IsAuthenticate);// Deprecied
    app.get('/v2/logout', middlewareServer.deprecatedRoute, logout); // Deprecied
    app.post("/login", middlewareServer.deprecatedRoute, login);// Deprecied
};

const logout = (req, res) => {
    res.clearCookie("jwt");
    res.removeHeader('x-auth-token');
    res.status(200).end();
};

const logoutAdmin = (req, res, next) => {
    try {
        req.logOut();
        return res.status(200).end();
    } catch (err) {
        next(err);
    }
};

const loginAdminAsClient = async (req, res, next) => {
    try {
        const user = await require("../orm/models/users").findOne({_id: req.body._id}, "-password");
        if (!user) {
            throw NSErrors.UserNotFound;
        }

        const logIn = require("util").promisify(req.logIn);
        await logIn(user, {session: false});
        const param = await require("../utils/server").getAppUrl(req);
        if (!param) {
            throw NSErrors.NotFound;
        }
        const token = generateJWTToken(res, user, user.isAdmin);
        return res.status(200).send({
            code : "LOGIN_SUCCESS",
            data : token
        });
    } catch (err) {
        return next(err);
    }
};