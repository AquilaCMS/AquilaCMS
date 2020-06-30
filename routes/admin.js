const serviceAdminInformation     = require("../services/admin");
const {authentication, adminAuth} = require("../middleware/authentication");
const modules                     = require("../services/modules");

module.exports = (router, adminFront) => {
    router.get("/v2/adminInformation", authentication, adminAuth, getAdminInformation);
    router.delete("/v2/adminInformation/:code", authentication, adminAuth, deleteAdminInformation);

    // BackOffice
    adminFront.get("/", getAdminHomepage);
    adminFront.get("/login", renderLogin);
};

/**
 * return backoffice login page
 */
const renderLogin = async (req, res, next) => {
    try {
        const {appUrl, adminPrefix} = await require("../utils/server").getAppUrl(req);
        if (!appUrl || !adminPrefix) return res.status(404).end();
        return res.render("login", {appUrl, adminPrefix});
    } catch (err) {
        return next(err);
    }
};

/**
 * Get admin information
 */
async function getAdminInformation(req, res, next) {
    try {
        const result = await serviceAdminInformation.getAdminInformation();
        return res.status(200).json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Delete admin information
 */
function deleteAdminInformation(req, res, next) {
    try {
        serviceAdminInformation.deleteAdminInformation(req.params.code);
        res.status(200).end();
    } catch (error) {
        return next(error);
    }
}

/**
 * return backoffice home page
 */
const getAdminHomepage = async (req, res, next) => {
    try {
        const {appUrl, adminPrefix} = await require("../utils/server").getAppUrl(req);
        if (!appUrl || !adminPrefix) return res.status(404).end();
        const tabM = await modules.loadAdminModules();
        return res.render("layout", {appUrl, adminPrefix, tabM});
    } catch (err) {
        return next(err);
    }
};
