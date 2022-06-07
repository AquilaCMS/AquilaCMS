/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path     = require('path');
const fs       = require('./fsp');
const utils    = require('./utils');
const NSError  = require('./errors/NSError');
const NSErrors = require('./errors/NSErrors');

let loadedModules;

/**
 * Module : Load the functions in the init.js of the modules if necessary
 * @param {string} property
 * @param {any} params
 * @param {Function} functionToExecute
 * @returns {any}
 */
const modulesLoadFunctions = async (property, params = {}, functionToExecute = undefined) => {
    if (global.moduleExtend[property] && typeof global.moduleExtend[property].function === 'function') {
        // here we run the function with error throwing (no try/catch)
        if (global.moduleExtend[property].throwError) {
            const fct = await global.moduleExtend[property].function(params);
            return fct;
        }
        // else, we run the function AND we catch the error to run the native function instead
        try {
            const fct = await global.moduleExtend[property].function(params);
            return fct; // Be careful, we need to define 'fct' before return it ! (don't know why)
        } catch (err) {
            console.error(`Overide function ${property} from module rise an error, use native function instead.`, err);
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
const createListModuleFile = async (theme = global.envConfig.environment.currentTheme) => {
    try {
        const modules_folder = path.join(global.appRoot, 'themes', theme, 'modules');
        await fs.ensureDir(modules_folder);
        const pathToListModules = path.join(modules_folder, 'list_modules.js');
        const isFileExists      = await fs.hasAccess(pathToListModules);
        if (!isFileExists) {
            await fs.writeFile(pathToListModules, 'export default [];');
        }
    } catch (err) {
        console.error(err);
    }
};

/**
 * display all modules installed with the current theme
 * @param {string} theme theme name
 */
const displayListModule = async (theme = global.envConfig.environment.currentTheme) => {
    try {
        const modules_folder = path.join(global.appRoot, `themes/${theme}/modules`);
        const fileContent    = await fs.readFile(`${modules_folder}/list_modules.js`);
        console.log(`%s@@ Theme's module (list_modules.js) : ${fileContent.toString()}%s`, '\x1b[32m', '\x1b[0m');
    } catch (e) {
        console.error('Cannot read list_module !');
    }
};

/**
 * @param {string} target_path_full
 */
const errorModule = async (target_path_full) => {
    try {
        await fs.unlink(target_path_full);
    } catch (err) {
        console.error(err);
    }
    const path = target_path_full.replace('.zip', '/');
    try {
        await fs.unlink(path);
    } catch (err) {
        console.error('Error: ', err);
    }
};

/**
 *
 * @param {any} myModule
 * @param {any} modulesActivated
 * @param {boolean} install
 * @returns {{api: {[index: string]: string}, theme: {[index: string]: string}}}
 */
const compareDependencies = (myModule, modulesActivated, install = true) => {
    const sameDependencies = {
        api   : {},
        theme : {}
    };
    for (const apiOrTheme of Object.keys(myModule.packageDependencies)) {
        for (const [name, version] of Object.entries(myModule.packageDependencies[apiOrTheme])) {
            if (!sameDependencies[apiOrTheme][name]) {
                sameDependencies[apiOrTheme][name] = install ? new Set() : [];
            }
            if (install) {
                sameDependencies[apiOrTheme][name].add(version);
            } else {
                sameDependencies[apiOrTheme][name].push(version);
            }
            if (modulesActivated.length > 0) {
                for (const elem of modulesActivated) {
                    if (
                        elem.packageDependencies
                        && elem.packageDependencies[apiOrTheme]
                    ) {
                        for (const [name1, version1] of Object.entries(elem.packageDependencies[apiOrTheme])) {
                            if (name1 === name) {
                                if (install) {
                                    sameDependencies[apiOrTheme][name1].add(version1);
                                } else {
                                    sameDependencies[apiOrTheme][name1].push(version1);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return sameDependencies;
};

/**
 * @param {any} module
 */
const checkModuleDepencendiesAtInstallation = async (module) => {
    if (module.moduleDependencies) {
        const missingDependencies = [];
        const needActivation      = [];
        const {Modules}           = require('../orm/models');
        const allmodule           = await Modules.find({}, {name: 1, active: 1});

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

/**
 * Module : Load the init.js files of the modules if necessary
 * @param {any} server
 */
const modulesLoadInit = async (server, runInit = true) => {
    const Modules  = require('../orm/models/modules');
    const _modules = await Modules.find({active: true}, {name: 1, _id: 0}).lean();
    loadedModules  = [..._modules].map((lmod) => ({...lmod, init: true, valid: false}));
    for (let i = 0; i < loadedModules.length; i++) {
        if (i === 0) {
            console.log('Required modules :');
        }
        console.log(`- ${loadedModules[i].name}`);
    }
    if (loadedModules.length > 0) {
        console.log('Start init loading modules');
    }
    for (let i = 0; i < loadedModules.length; i++) {
        const initModuleFile = path.join(global.appRoot, `/modules/${loadedModules[i].name}/init.js`);
        if (fs.existsSync(initModuleFile)) {
            process.stdout.write(`- ${loadedModules[i].name}`);
            try {
                const isValid = await utils.checkModuleRegistryKey(loadedModules[i].name);
                if (!isValid) {
                    throw new Error('Error checking licence');
                }
                loadedModules[i].valid = true;
                if (runInit) {
                    require(initModuleFile)(server);
                }
                process.stdout.write('\x1b[32m \u2713 \x1b[0m\n');
            } catch (err) {
                loadedModules[i].init = false;
                process.stdout.write('\x1b[31m \u274C An error has occurred \x1b[0m\n');
                console.error(err);
                return false;
            }
        }
    }
    if (loadedModules.length > 0) {
        console.log('Finish init loading modules');
    } else {
        console.log('No modules to load');
    }
};

/**
 * Module : Loads initAfter.js files for active modules
 * @param {any} apiRouter
 * @param {any} server
 * @param {any} passport
 */
const modulesLoadInitAfter = async (apiRouter, server, passport) => {
    loadedModules = loadedModules.filter((mod) => mod.init) || [];
    if (loadedModules.length > 0) {
        console.log('Start initAfter loading modules');
        for (const mod of loadedModules) {
            try {
                // Get the initAfter.js files of the modules
                await new Promise(async (resolve, reject) => {
                    try {
                        if (fs.existsSync(path.join(global.appRoot, `/modules/${mod.name}/initAfter.js`))) {
                            process.stdout.write(`- ${mod.name}`);
                            if (!mod.valid) {
                                const isValid = await utils.checkModuleRegistryKey(mod.name);
                                if (!isValid) {
                                    throw new Error('Error checking licence');
                                }
                            }
                            require(path.join(global.appRoot, `/modules/${mod.name}/initAfter.js`))(resolve, reject, server, apiRouter, passport);
                        } else {
                            process.stdout.write(`- ${mod.name} \x1b[33m (can't access to initAfter.js or no initAfter.js)`);
                        }
                        resolve();
                    } catch (err) {
                        process.stdout.write('\x1b[31m \u274C \x1b[0m\n');
                        reject(err);
                    }
                });
                process.stdout.write('\x1b[32m \u2713 \x1b[0m\n');
            } catch (err) {
                console.error(err);
            }
        }
        loadedModules = undefined;
        console.log('Finish initAfter loading modules');
    }
};

module.exports = {
    modulesLoadFunctions,
    createListModuleFile,
    displayListModule,
    errorModule,
    compareDependencies,
    checkModuleDepencendiesAtInstallation,
    checkModuleDepencendiesAtUninstallation,
    modulesLoadInit,
    modulesLoadInitAfter
};