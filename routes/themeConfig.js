const {authentication, adminAuth} = require("../middleware/authentication");
const serviceThemeConfig = require("../services/themeConfig");

// Fichier themeConfig.json à la racine des thèmes

module.exports = function (app) {
    app.post("/v2/themeConfig", getThemeConfig);
    app.get("/v2/themeConfig/:key", getThemeConfigByKey);
    app.put("/v2/themeConfig", authentication, adminAuth, setThemeConfig);
};

async function getThemeConfig(req, res, next) {
    try {
        let themeConf = await serviceThemeConfig.getThemeConfig(req.body.PostBody);
        if (!themeConf) {
            themeConf = {config: {}};
        }
        res.json(themeConf);
    } catch (error) {
        return next(error);
    }
}

async function getThemeConfigByKey(req, res, next) {
    try {
        res.json(await serviceThemeConfig.getThemeConfigByKey(req.params.key));
    } catch (error) {
        return next(error);
    }
}

async function setThemeConfig(req, res, next) {
    try {
        res.json(await serviceThemeConfig.setThemeConfig(req.body));
    } catch (error) {
        return next(error);
    }
}
