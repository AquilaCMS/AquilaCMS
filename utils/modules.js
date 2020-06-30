const path      = require("path");
const fs        = require("./fsp");
const npm       = require('./npm');
const NSError   = require('./errors/NSError');
const NSErrors  = require('./errors/NSErrors');

/**
 * Module : Charge les fonctions dans les init.js des modules si besoin
 */
const modules_LoadFunctions = async (property, params = {}, functionToExecute) => {
    if (global.moduleExtend[property] && typeof global.moduleExtend[property].function === "function") {
        return global.moduleExtend[property].function(params);
    }
    return functionToExecute();
};

/**
 * Module : Create '\themes\ {theme_name}\modules\list_modules.js'
 */
const createListModuleFile = async (theme = global.envConfig.environment.currentTheme) => {
    let modules_folder = "";
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
    let modules_folder = "";
    try {
        modules_folder    = `./themes/${theme}/modules`;
        const fileContent = await fs.readFile(`${modules_folder}/list_modules.js`);
        console.log(`%s@@ Theme's module (list_modules.js) : ${fileContent.toString()}%s`, '\x1b[32m', '\x1b[0m');
    } catch (e) {
        console.error("Cannot read list_module !");
    }
};

const errorModule = async (target_path_full) => {
    try {
        await fs.unlink(target_path_full);
    } catch (err) {
        console.error(err);
    }
    const path = target_path_full.replace(".zip", "/");
    try {
        await fs.unlink(path);
    } catch (err) {
        console.error('Error: ', err);
    }
};

const cleanPackageVersion = async (dependencies) => {
    for (let i = 0; i < dependencies.length; i++) {
        let dependency = dependencies[i];
        dependency = dependency.split("@");
        if (dependency.length !== 0 && dependency[dependency.length - 1] !== "") {
            if (dependency.length === 1) {
                dependency.push("latest");
            }
            if (dependency[0] === "") {
                dependency.splice(0, 1);
                dependency[0] = `@${dependency[0]}`;
            }
            const {result} = await npm.npmCommand('dist-tag', ['ls', dependency[0]]);
            for (const [key, elem] of Object.entries(result)) {
                if (dependency[1] === key) {
                    dependency[1] = elem;
                }
            }
            dependencies[i] = dependency.join("@");
        } else if (dependencies[i].endsWith("@")) {
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
            const dependencyModule = moduleDependency.split("@");
            if (dependencyModule[0] === "") {
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
                            const dependencyElem = elemDependencies.split("@");
                            if (dependencyElem[0] === "") {
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
        const needActivation = [];
        const {Modules} = require('../orm/models');
        const allmodule = await Modules.find({}, {name: 1, active: 1});

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
        const {Modules} = require('../orm/models');
        const allmodule = await Modules.find(
            {$and: [{name: {$ne: myModule.name}}, {active: true}]},
            {name: 1, moduleDependencies: 1}
        );

        for (const elem of allmodule) {
            if (elem.moduleDependencies.find((dep) => dep === myModule.name)) {
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
        const packageName = dependency.split("@")[0];
        if (toBeChanged[packageName]) {
            const choosedVersionPackageName = toBeChanged[packageName].split("@")[0];
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
const modules_LoadInit = async (express) => {
    try {
        console.log('Start init modules');
        const Modules  = require("../orm/models/modules");
        const _modules = await Modules.find({active: true});
        if (_modules.length > 0) {
            console.log("Required modules :");
        }
        for (let i = 0; i < _modules.length; i++) {
            console.log(` - ${_modules[i].name}`);
            if (await fs.access(path.join(global.appRoot, `/modules/${_modules[i].name}/init.js`))) {
                require(path.join(global.appRoot, `/modules/${_modules[i].name}/init.js`))(express, global.appRoot, global.envFile);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        console.log('Finish init modules');
    }
};

/**
 * Module : Charge les fichiers initAfter.js des modules actifs
 */
const modules_LoadInitAfter = async (apiRouter, server, passport) => {
    // TODO P3 : peut etre factorisé
    console.log('Start initAfter modules');
    const logFinish = 'Finish initAfter modules';

    try {
        const {Modules} = require("../orm/models");
        const _modules  = await Modules.find({active: true});
        if (_modules.length > 0) {
            try {
                for (const module of _modules) {
                    // Récupère les fichiers initAfter.js des modules
                    await new Promise(async (resolve, reject) => {
                        try {
                            if (await fs.access(path.join(global.appRoot, `/modules/${module.name}/initAfter.js`))) {
                                require(path.join(global.appRoot, `/modules/${module.name}/initAfter.js`))(resolve, reject, server, apiRouter, passport);
                            }
                            console.log(`${logFinish} : ${module.name}`);
                            resolve();
                        } catch (err) {
                            console.log(logFinish);
                            reject(err);
                        }
                    });
                }
            } catch (err) {
                console.error(err);
                console.log(logFinish);
            }
        } else {
            console.log(logFinish);
        }
    } catch (err) {
        console.error(err);
        console.log(logFinish);
    }
};

module.exports = {
    modules_LoadFunctions,
    createListModuleFile,
    displayListModule,
    errorModule,
    cleanPackageVersion,
    compareDependencies,
    checkModuleDepencendiesAtInstallation,
    checkModuleDepencendiesAtUninstallation,
    cleanAndToBeChanged,
    modules_LoadInit,
    modules_LoadInitAfter
};