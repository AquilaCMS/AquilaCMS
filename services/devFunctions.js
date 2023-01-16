/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path         = require('path');
const mongoose     = require('mongoose');
const fs           = require('../utils/fsp');
const {Products}   = require('../orm/models');
const utilsModules = require('../utils/modules');

const createModelData = async () => {
    const forbidenModels = ['configuration', 'modules', 'BundleProduct', 'SimpleProduct', 'simple', 'staticsPreview', 'statstoday', 'cart', 'admininformation', 'adminRights', 'newsPreview', 'SimpleProductPreview', 'VirtualProductPreview', 'BundleProductPreview', 'productsPreview', 'shortcodes', 'statshistory', 'statsToday', 'staticsPreview'];
    const schemas        = [];
    const themeFolder    = path.join(global.appRoot, 'themes', global.envConfig.environment.currentTheme);
    for (const modelName of mongoose.modelNames()) {
        const model = await mongoose.model(modelName).find({}, '-__v');
        if (forbidenModels.indexOf(modelName) === -1) {
            schemas.push({collection: modelName, datas: model});
        }
    }
    await fs.mkdir(path.join(themeFolder, '/demoDatas/'), {recursive: true});
    const noCopy = ['users', 'configurations'];
    for (const data in schemas) {
        if (!noCopy.includes(schemas[data].collection) && schemas[data].datas.length !== 0) {
            const json = JSON.stringify(schemas[data], null, 2);
            await fs.writeFile(path.join(themeFolder, `/demoDatas/${schemas[data].collection}.json`), json, 'utf8');
        }
    }

    const photoPath = path.join(global.appRoot, require('../utils/server').getUploadDirectory());
    await fs.mkdir(photoPath, {recursive: true});
    if (!await fs.hasAccess(photoPath)) {
        throw new Error(`"${photoPath}" is not readable`);
    }

    if (!(await fs.hasAccess(photoPath, fs.constants.W_OK))) {
        throw new Error(`"${photoPath}" is not writable`);
    }

    await fs.copyRecursive(
        photoPath,
        path.join(themeFolder, '/demoDatas/files'),
        false,
        ['cache', 'temp']
    );
};

/**
 * @description Fix attribute inconsistencies to sort them in alphabetical order
 */
const sortAttribs = async () => {
    try {
        console.log('Start of sorting of attributes by alphabetical order');

        const _products = await Products.find({});

        for (let i = 0, leni = _products.length; i < leni; i++) {
            // console.log(`${i}/${_products.length}`);
            // const attribs = _products[i].attributes;

            _products[i].attributes.sort(function (first, second) {
                if (first.code < second.code) {
                    return -1;
                }
                if (first.code > second.code) {
                    return 1;
                }
                return 0;
            });

            await _products[i].save();
            // await Products.updateOne({_id: _products[i]._id}, {attributes: attribs});
        }

        console.log('End of sorting');
        return {message: 'ok'};
    } catch (err) {
        console.error('Error of sorting');
        throw err;
    }
};

/**
 * @description Hot reaload the API
 */
const hotReloadAPI = async (express, server, passport) => {
    const reloadRouter  = express.Router();
    let apiIndexInStack;
    const numberOfStack = server._router.stack.length;
    for (let i = 0; i < numberOfStack; i++) {
        if (server._router.stack[i].name === 'router' && server._router.stack[i].regexp.toString().includes('api')
        && server._router.stack[(i + 1)].regexp.toString().includes('api')) {
            apiIndexInStack = i;
            break;
        }
    }
    reloadRouter.route('/reloadAPI').get(async (req, res) => {
        try {
            // Remove the matched middleware
            server._router.stack.splice(apiIndexInStack, 1);
            server._router.stack.splice(apiIndexInStack, 1);
            const newAPIRouter = express.Router();
            // re-add router
            server.use('/api', newAPIRouter, reloadRouter);
            for (let i = 0; i < 2; i++) {
                const lastStack = server._router.stack[server._router.stack.length - 1];
                server._router.stack.pop();
                server._router.stack.splice(apiIndexInStack, 0, lastStack);
            }
            // we remove cache of /routes/* and /services/*
            const date = Date.now();
            for (const oneLine in require.cache) {
                if (!require.cache[oneLine]) {
                    continue;
                }
                for (const oneFolder of ['routes', 'services']) {
                    const pathToFolder = path.join(global.appRoot, oneFolder);
                    if (oneLine.startsWith(pathToFolder)) {
                        delete require.cache[oneLine];
                    }
                }
            }
            const time = (Date.now() - date) / 1000;
            console.log(`reloadAPI : delete require cache in %s${time}%s`, '\x1b[33m', '\x1b[0m');
            require('../routes').loadDynamicRoutes(newAPIRouter);
            await utilsModules.modulesLoadInit(server, false);
            await utilsModules.modulesLoadInitAfter(newAPIRouter, server, passport);
            return res.json('ok');
        } catch (errorInReload) {
            return res.json({
                error : errorInReload.toString()
            });
        }
    });
    server.use('/api', reloadRouter);
    // we move the middleware
    const lastStack = server._router.stack[server._router.stack.length - 1];
    server._router.stack.pop();
    server._router.stack.splice(apiIndexInStack, 0, lastStack);
};

module.exports = {
    createModelData,
    sortAttribs,
    hotReloadAPI
};
