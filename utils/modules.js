const path     = require('path');
const fs       = require('./fsp');
const npm      = require('./npm');
const utils    = require('./utils');
const NSError  = require('./errors/NSError');
const NSErrors = require('./errors/NSErrors');

let loadedModules;

/**
 * Module : Charge les fonctions dans les init.js des modules si besoin
 */
const modulesLoadFunctions = async (property, params = {}, functionToExecute) => {
    if (global.moduleExtend[property] && typeof global.moduleExtend[property].function === 'function') {
        return global.moduleExtend[property].function(params);
    }
    return functionToExecute();
};

/**
 * Module : Create '\themes\ {theme_name}\modules\list_modules.js'
 */
const createListModuleFile = async (theme = global.envConfig.environment.currentTheme) => {
    let modules_folder = '';
    try {
        modules_folder = path.join(global.appRoot, `themes/${theme}/modules`);
        await fs.ensureDir(modules_folder);
        const isFileExists = await fs.access(`${modules_folder}/list_modules.js`);
        if (!isFileExists) {
            await fs.writeFile(`${modules_folder}/list_modules.js`, 'export default [];');
        }
    } catch (err) {
        console.error(err);
    }
};

/**
 * display all modules installed with the current theme
 * @param {String} theme theme name
 */
const displayListModule = async (theme = global.envConfig.environment.currentTheme) => {
    let modules_folder = '';
    try {
        modules_folder    = `./themes/${theme}/modules`;
        const fileContent = await fs.readFile(`${modules_folder}/list_modules.js`);
        console.log(`%s@@ Theme's module (list_modules.js) : ${fileContent.toString()}%s`, '\x1b[32m', '\x1b[0m');
    } catch (e) {
        console.error('Cannot read list_module !');
    }
};

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

const cleanPackageVersion = async (dependencies) => {
    for (let i = 0; i < dependencies.length; i++) {
        let dependency = dependencies[i];
        dependency     = dependency.split('@');
        if (dependency.length !== 0 && dependency[dependency.length - 1] !== '') {
            if (dependency.length === 1) {
                dependency.push('latest');
            }
            if (dependency[0] === '') {
                dependency.splice(0, 1);
                dependency[0] = `@${dependency[0]}`;
            }
            const {result} = await npm.npmCommand('dist-tag', ['ls', dependency[0]]);
            for (const [key, elem] of Object.entries(result)) {
                if (dependency[1] === key) {
                    dependency[1] = elem;
                }
            }
            dependencies[i] = dependency.join('@');
        } else if (dependencies[i].endsWith('@')) {
            dependencies[i] = dependencies[i].slice(0, dependencies[i].length - 1);
        }
    }
    return dependencies;
};

const compareDependencies = (myModule, modulesActivated, install = true) => {
    const sameDependencies = {
        api   : {},
        theme : {}
    };
    for (const apiOrTheme of Object.keys(myModule.packageDependencies)) {
        for (const moduleDependency of Object.values(myModule.packageDependencies[apiOrTheme])) {
            const dependencyModule = moduleDependency.split('@');
            if (dependencyModule[0] === '') {
                dependencyModule.splice(0, 1);
                dependencyModule[0] = `@${dependencyModule[0]}`;
            }
            if (!sameDependencies[apiOrTheme][dependencyModule[0]]) {
                if (install) {
                    sameDependencies[apiOrTheme][dependencyModule[0]] = new Set();
                } else {
                    sameDependencies[apiOrTheme][dependencyModule[0]] = [];
                }
            }
            if (install) {
                sameDependencies[apiOrTheme][dependencyModule[0]].add(moduleDependency);
            } else {
                sameDependencies[apiOrTheme][dependencyModule[0]].push(moduleDependency);
            }
            if (modulesActivated.length > 0) {
                for (const elem of modulesActivated) {
                    if (
                        elem.packageDependencies
                        && elem.packageDependencies[apiOrTheme]
                        && elem.packageDependencies[apiOrTheme].length > 0
                    ) {
                        for (const elemDependencies of elem.packageDependencies[apiOrTheme]) {
                            const dependencyElem = elemDependencies.split('@');
                            if (dependencyElem[0] === '') {
                                dependencyElem.splice(0, 1);
                                dependencyElem[0] = `@${dependencyElem[0]}`;
                            }
                            if (dependencyElem[0] === dependencyModule[0]) {
                                if (install) {
                                    sameDependencies[apiOrTheme][dependencyElem[0]].add(elemDependencies);
                                } else {
                                    sameDependencies[apiOrTheme][dependencyElem[0]].push(elemDependencies);
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
 * cleanAndToBeChanged
 * @param {string[]} dependencies dependencies
 * @param {{api: {}, theme: {}}} toBeChanged toBeChanged
 */
const cleanAndToBeChanged = async (dependencies, toBeChanged) => {
    let allModules = [];
    for (const dependency of await cleanPackageVersion(dependencies)) {
        const packageName = dependency.split('@')[0];
        if (toBeChanged[packageName]) {
            const choosedVersionPackageName = toBeChanged[packageName].split('@')[0];
            if (packageName === choosedVersionPackageName) {
                allModules = [...allModules, toBeChanged[packageName]];
            }
        } else {
            allModules = [...allModules, dependency];
        }
    }
    return allModules;
};

/**
 * Module : Charge les fichiers init.js des modules si besoin
 */
const modulesLoadInit = async (server) => {
    const Modules  = require('../orm/models/modules');
    const _modules = await Modules.find({active: true}, {name: 1}).lean();
    loadedModules  = [..._modules];
    loadedModules  = loadedModules.map((lmod) => {return {...lmod, init: true, valid: false};});
    if (loadedModules.length > 0) {
        console.log('Start init loading modules');
        console.log('Required modules :');
    }
    for (let i = 0; i < loadedModules.length; i++) {
        const initModuleFile = path.join(global.appRoot, `/modules/${loadedModules[i].name}/init.js`);
        if (await fs.access(initModuleFile)) {
            process.stdout.write(`- ${loadedModules[i].name}`);
            try {
                const isValid = await utils.checkModuleRegistryKey(loadedModules[i].name);
                if (!isValid) {
                    throw new Error('Error checking licence');
                }
                loadedModules[i].valid = true;
                require(initModuleFile)(server);
                process.stdout.write('\x1b[32m \u2713 \x1b[0m\n');
            } catch (err) {
                loadedModules[i].init = false;
                process.stdout.write('\x1b[31m \u274C \x1b[0m\n');
                return false;
            }
        }
    }
    if (loadedModules.length > 0) {
        console.log('Finish init loading modules');
    } else {
        console.log('no modules to load');
    }
};

/**
 * Module : Charge les fichiers initAfter.js des modules actifs
 */
const modulesLoadInitAfter = async (apiRouter, server, passport) => {
    loadedModules = loadedModules.filter((mod) => mod.init) || [];
    if (loadedModules.length > 0) {
        console.log('Start initAfter loading modules');
        for (const mod of loadedModules) {
            try {
                // Récupère les fichiers initAfter.js des modules
                await new Promise(async (resolve, reject) => {
                    try {
                        if (await fs.access(path.join(global.appRoot, `/modules/${mod.name}/initAfter.js`))) {
                            process.stdout.write(`- ${mod.name}`);
                            if (!mod.valid) {
                                const isValid = await utils.checkModuleRegistryKey(mod.name);
                                if (!isValid) {
                                    throw new Error('Error checking licence');
                                }
                            }
                            require(path.join(global.appRoot, `/modules/${mod.name}/initAfter.js`))(resolve, reject, server, apiRouter, passport);
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
    cleanPackageVersion,
    compareDependencies,
    checkModuleDepencendiesAtInstallation,
    checkModuleDepencendiesAtUninstallation,
    cleanAndToBeChanged,
    modulesLoadInit,
    modulesLoadInitAfter
};