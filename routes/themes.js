/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuthRight}   = require('../middleware/authentication');
const themesServices     = require('../services/themes');
const serviceThemeConfig = require('../services/themeConfig');
const ServiceConfig      = require('../services/config');
const utilsThemes        = require('../utils/themes');
const {multerUpload}     = require('../middleware/multer');

module.exports = function (app) {
    app.get('/v2/themes',                  adminAuthRight('themes'), listTheme);
    app.post('/v2/themes/upload',          adminAuthRight('themes'), multerUpload.any(), uploadTheme);
    app.post('/v2/themes/delete',          adminAuthRight('themes'), deleteTheme);
    app.post('/v2/themes/copyDatas',       adminAuthRight('themes'), copyDatas);
    app.get('/v2/themes/css/:cssName',     adminAuthRight('design'), getCustomCss);
    app.post('/v2/themes/css/:cssName',    adminAuthRight('design'), postCustomCss);
    app.get('/v2/themes/css',              adminAuthRight('design'), getAllCssComponentName);
    app.post('/v2/themes/save/:type',      adminAuthRight('themes'), save);
    app.post('/v2/themes/package/install', adminAuthRight('themes'), packageInstall);
    app.post('/v2/themes/package/build',   adminAuthRight('themes'), buildTheme);
    app.get('/v2/themes/informations',     adminAuthRight('themes'), getThemeInformations);
};

/**
 * @description Save the selected theme and update.
 */
async function save(req, res, next) {
    req.setTimeout(300000);
    try {
        const type       = req.params.type;
        const sauvegarde = await themesServices.changeTheme(req.body.environment.currentTheme, type);
        res.send({data: sauvegarde});
    } catch (err) {
        next(err);
    }
}

/**
 * @description List all folders / themes
 */
async function listTheme(req, res, next) {
    try {
        const allTheme = await themesServices.listTheme();
        res.send({data: allTheme});
    } catch (err) {
        return next(err);
    }
}

/**
 * @description Get the contents of the custom.css file
 */
async function getCustomCss(req, res, next) {
    try {
        const customCss = await themesServices.getCustomCss(req.params.cssName);
        return res.send({data: customCss});
    } catch (err) {
        return next(err);
    }
}

/**
 * @description Get the list of css in the folder
 */
async function getAllCssComponentName(req, res, next) {
    try {
        const cssNames = await themesServices.getAllCssComponentName();
        return res.send(cssNames);
    } catch (err) {
        return next(err);
    }
}

/**
* Save the content to the custom.css file
* @route POST /v2/themes/css/:cssName
* @group Themes - Operations about themes
* @param {string} datas.body - content to write in file
* @param {string} cssName.params.required - content to write in file
* @returns {object} 200 -
* @returns {Error}  400 - design_theme_css_save
*/
async function postCustomCss(req, res, next) {
    try {
        await themesServices.setCustomCss(req.params.cssName, req.body.datas);
        return res.json();
    } catch (error) {
        return next(error);
    }
}

/**
 * @description Upload, dezip and install theme
 */
const uploadTheme = async (req, res, next) => {
    try {
        const ret = await themesServices.uploadTheme(req.files[0].originalname, req.files[0].path);
        return res.json(ret);
    } catch (error) {
        return next(error);
    }
};

/**
 * @description Remove selected theme
 */
const deleteTheme = async (req, res, next) => {
    try {
        const ret = await themesServices.deleteTheme(req.body.themeName);
        return res.json(ret);
    } catch (error) {
        return next(error);
    }
};

/**
 * Copy datas of selected theme
 */
const copyDatas = async (req, res, next) => {
    try {
        await themesServices.copyDatas(req.body.themeName, req.body.override, req.body.configuration, req.body.fileNames, req.body.otherParams);
        return res.end();
    } catch (error) {
        return next(error);
    }
};

/**
 * @description Run a 'yarn install' command on the defined theme
 */
async function packageInstall(req, res, next) {
    req.setTimeout(300000);
    try {
        let themeName       = '';
        let devDependencies = false;
        if (req && req.body) {
            if (req.body.devDependencies) {
                devDependencies = true;
            }
            if (req.body.themeName) {
                themeName = req.body.themeName;
            }
        }
        const data = await themesServices.installTheme(themeName, devDependencies);
        return res.send(data);
    } catch (error) {
        return next(error);
    }
}

/**
 * @description Run an 'npm run build' command on the defined theme
 */
async function buildTheme(req, res, next) {
    req.setTimeout(300000);
    try {
        let themPath = req.body.themeName;
        if (!themPath || themPath === '') {
            themPath = themesServices.getThemePath();
        }
        themPath   = themPath.replace('./themes/', '');
        const data = await themesServices.buildTheme(themPath);
        res.send(data);
    } catch (error) {
        return next(error);
    }
}

async function getThemeInformations(req, res, next) {
    try {
        const themeConf  = await serviceThemeConfig.getThemeConfig({
            filter    : {},
            structure : {},
            limit     : 99
        });
        const config     = (await ServiceConfig.getConfig({
            structure : {
                _id                        : 0,
                'environment.adminPrefix'  : 1,
                'environment.appUrl'       : 1,
                'environment.currentTheme' : 1
            }
        }, req.info));
        const listTheme  = await themesServices.listTheme();
        const listFiles  = await themesServices.getDemoDatasFilesName();
        const configFile = utilsThemes.loadThemeInfo(config.environment.currentTheme) || '';
        res.send({
            themeConf,
            configEnvironment : config,
            configFile,
            listTheme,
            listFiles
        });
    } catch (error) {
        return next(error);
    }
}
