/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path     = require('path');
const {fs}     = require('aql-utils');
const NSError  = require('./errors/NSError');
const NSErrors = require('./errors/NSErrors');
const logger   = require('./logger');

/**
 * Module : Load the functions in the init.js of the modules if necessary
 * @param {string} property
 * @param {any} params
 * @param {Function} functionToExecute
 * @returns {any}
 */
const modulesLoadFunctions = async (property, params = {}, functionToExecute = undefined) => {
    if (global.aquila.moduleExtend[property] && typeof global.aquila.moduleExtend[property].function === 'function') {
        // here we run the function with error throwing (no try/catch)
        if (global.aquila.moduleExtend[property].throwError) {
            const fct = await global.aquila.moduleExtend[property].function(params);
            return fct;
        }
        // else, we run the function AND we catch the error to run the native function instead
        try {
            const fct = await global.aquila.moduleExtend[property].function(params);
            return fct; // Be careful, we need to define 'fct' before return it ! (don't know why)
        } catch (err) {
            logger.error(`Overide function ${property} from module rise an error, use native function instead. ${err}`);
        }
    }
    if (functionToExecute && typeof functionToExecute === 'function') {
        return functionToExecute();
    }
};

/**
 * Module : Create '\themes\ {theme_name}\modules\list_modules.js'
 * @param {string} theme
 */
const createListModuleFile = async (theme = global.aquila.envConfig.environment.currentTheme) => {
    try {
        const modules_folder = path.join(global.aquila.themesPath, theme, 'modules');
        await fs.ensureDir(modules_folder);
        const pathToListModules = path.join(modules_folder, 'list_modules.js');
        const isFileExists      = await fs.hasAccess(pathToListModules);
        if (!isFileExists) {
            await fs.writeFile(pathToListModules, 'export default [];');
        }
    } catch (err) {
        logger.error(err.message);
    }
};

/**
 * display all modules installed with the current theme
 * @param {string} theme theme name
 */
const displayListModule = async (theme = global.aquila.envConfig.environment.currentTheme) => {
    try {
        const modules_folder = path.join(global.aquila.themesPath, `${theme}/modules`);
        const fileContent    = await fs.readFile(`${modules_folder}/list_modules.js`);
        console.log(`%s@@ Theme's module (list_modules.js) : ${fileContent.toString()}%s`, '\x1b[32m', '\x1b[0m');
    } catch (e) {
        logger.error('Cannot read list_module !');
    }
};

/**
 * @param {string} target_path_full
 */
const errorModule = async (target_path_full) => {
    try {
        await fs.unlink(target_path_full);
    } catch (err) {
        logger.error(err.message);
    }
    const path = target_path_full.replace('.zip', '/');
    try {
        await fs.unlink(path);
    } catch (err) {
        logger.error(`Error: ${err.message}`);
    }
};

const checkModuleDepencendiesAtInstallation = async (module) => {
    if (module.moduleDependencies) {
        const missingDependencies = [];
        const needActivation      = [];
        const {Modules}           = require('../orm/models');
        const allmodule           = await Modules.find({}, {name: 1, active: 1}).lean();

        for (const elem of module.moduleDependencies) {
            const found = allmodule.find((mod) => mod.name === elem);
            if (!found) {
                missingDependencies.push(elem);
            } else {
                if (!found.active) {
                    needActivation.push(found.name);
                }
            }
        }

        if (missingDependencies.length > 0 || needActivation.length > 0) {
            const error = new NSError(
                NSErrors.MissingModuleDependencies.status,
                NSErrors.MissingModuleDependencies.code
            );
            error.datas = {missingDependencies, needActivation};
            throw error;
        }
    }
};

/**
 * @param {any} myModule
 */
const checkModuleDepencendiesAtUninstallation = async (myModule) => {
    if (myModule.moduleDependencies) {
        const needDeactivation = [];
        const {Modules}        = require('../orm/models');
        const allmodule        = await Modules.find(
            {$and: [{name: {$ne: myModule.name}}, {active: true}]},
            {name: 1, moduleDependencies: 1}
        );

        for (const elem of allmodule) {
            if (elem.moduleDependencies && elem.moduleDependencies.find((dep) => dep === myModule.name)) {
                needDeactivation.push(elem.name);
            }
        }

        if (needDeactivation.length > 0) {
            const error = new NSError(
                NSErrors.RequiredModuleDependencies.status,
                NSErrors.RequiredModuleDependencies.code
            );
            error.datas = {needDeactivation};
            throw error;
        }
    }
};

module.exports = {
    modulesLoadFunctions,
    createListModuleFile,
    displayListModule,
    errorModule,
    checkModuleDepencendiesAtInstallation,
    checkModuleDepencendiesAtUninstallation
};