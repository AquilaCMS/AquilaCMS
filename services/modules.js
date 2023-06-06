/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const AdmZip                      = require('adm-zip');
const path                        = require('path');
const mongoose                    = require('mongoose');
const rimraf                      = require('rimraf');
const semver                      = require('semver');
const slash                       = require('slash');
const {fs, aquilaEvents, execCmd} = require('aql-utils');
const utilsThemes                 = require('../utils/themes');
const {isEqual}                   = require('../utils/utils');
const QueryBuilder                = require('../utils/QueryBuilder');
const modulesUtils                = require('../utils/modules');
const {getEnv}                    = require('../utils/server');
const NSErrors                    = require('../utils/errors/NSErrors');
const {Modules}                   = require('../orm/models');
const themesService               = require('./themes');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Modules, restrictedFields, defaultFields);

/**
 * Get modules
 */
const getModules = async (PostBody) => queryBuilder.find(PostBody);

/**
 * Get one module
 */
const getModule = async (PostBody) => queryBuilder.findOne(PostBody);

/**
 * Set the configuration (conf field) of a module
 * @param body : body of the request, it will update the module configuration
 * @param _id : string : ObjectId of the module configuration has changed
 * @returns return configuration's module
 * @deprecated
 */
const setModuleConfigById = async (_id, config) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
    // If a change is made to an active document then the others are deactivated
    const result = await Modules.findByIdAndUpdate(_id, {config}, {new: true, runValidators: true});
    if (!result) throw NSErrors.AgendaUpdateError;
    return result;
};

/**
 * unzip module in `modules` folder
 * and save module added in database
 * @param {Object} zipFile file information from express
 * @param {string} file.destination
 * @param {string} file.encoding
 * @param {string} file.fieldname
 * @param {string} file.filename
 * @param {string} file.mimetype
 * @param {string} file.originalname
 * @param {string} file.path
 * @param {string} file.size
 */
const initModule = async (files) => {
    if (!files || files.length === 0) throw NSErrors.MissingParameters;
    const {originalname, path: filepath} = files[0];
    if (path.extname(originalname) !== '.zip') {
        throw NSErrors.InvalidFile;
    }
    console.log('Upload module...');
    const moduleFolderName    = 'modules/';
    const moduleFolderAbsPath = path.resolve(global.aquila.appRoot, moduleFolderName);  // /path/to/AquilaCMS/modules/
    const zipFilePath         = path.resolve(moduleFolderAbsPath, originalname); // /path/to/AquilaCMS/modules/my-module.zip
    const extractZipFilePath  = zipFilePath.replace('.zip', '/');                // /path/to/AquilaCMS/modules/my-module/

    // move the file from the temporary location to the intended location
    await fs.mkdir(moduleFolderAbsPath, {recursive: true});
    await fs.copyFile(path.resolve(global.aquila.appRoot, filepath), zipFilePath);
    await fs.unlink(path.resolve(global.aquila.appRoot, filepath));

    try {
        const zip      = new AdmZip(zipFilePath);
        const infojson = zip.getEntry(`${originalname.replace('.zip', '/')}info.json`);
        if (!infojson) {
            throw NSErrors.ModuleInfoNotFound; // info.json not found in zip
        } else if (originalname.replace('.zip', '') !== JSON.parse(infojson.getData().toString()).info.name) {
            throw NSErrors.ModuleNameMissmatch;
        }
        const moduleAquilaVersion = JSON.parse(infojson.getData().toString()).info.aquilaVersion;
        if (moduleAquilaVersion) {
            const packageAquila = (await fs.readFile(path.resolve(global.aquila.appRoot, 'package.json'), 'utf8')).toString();
            const aquilaVersion = JSON.parse(packageAquila).version;
            if (!semver.satisfies(aquilaVersion.replace(/\.0+/g, '.'), moduleAquilaVersion.replace(/\.0+/g, '.'))) {
                throw NSErrors.ModuleAquilaVersionNotSatisfied;
            }
        }
        let found = false;
        for (const zipEntry of zip.getEntries()) {
            if (
                zipEntry.entryName === originalname.replace('.zip', '/')
                    || zipEntry.entryName.startsWith(originalname.replace('.zip', '/'))
            ) {
                found = true;
            }
        }
        if (!found) {
            throw NSErrors.ModuleMainFolder; // missing main folder in zip
        }
        console.log('Unziping module...');
        await new Promise((resolve, reject) => {
            zip.extractAllToAsync(moduleFolderAbsPath, true, (err) => {
                if (err) {
                    console.error(err);
                    reject();
                }
                resolve();
            });
        });
        console.log('Unzip module ok, reading info.json...');
        const infoPath = path.resolve(extractZipFilePath, 'info.json');
        if (!fs.existsSync(infoPath)) {
            throw NSErrors.ModuleInfoNotFound;
        }
        let infoFile = await fs.readFile(path.resolve(extractZipFilePath, 'info.json'));
        infoFile     = infoFile.toString();
        const {info} = JSON.parse(infoFile);
        console.log('Installing module...');

        const myModule  = await Modules.findOne({name: info.name});
        const newModule = await Modules.findOneAndUpdate({name: info.name}, {
            name                     : info.name,
            description              : info.description,
            version                  : info.version,
            path                     : slash(path.join(moduleFolderName, originalname).replace('.zip', '/')),
            url                      : info.url,
            cronNames                : info.cronNames,
            mailTypeCode             : info.mailTypeCode,
            loadApp                  : info.loadApp,
            loadTranslationBack      : info.loadTranslationBack,
            loadTranslationFront     : info.loadTranslationFront,
            packageDependencies      : info.packageDependencies || {},
            moduleDependencies       : info.moduleDependencies,
            component_template_front : info.component_template_front || null,
            files                    : info.files || [],
            type                     : info.type,
            types                    : info.types,
            versionAquila            : info.versionAquila,
            active                   : !!(myModule && myModule.active)
        }, {upsert: true, new: true});

        // Check if the functions init, initAfter, uninit and rgpd are present
        const pathUninit = path.join(extractZipFilePath, 'uninit.js');
        if (!fs.existsSync(pathUninit)) {
            console.error(`Uninit file is missing for : ${info.name}`);
        }

        const pathInit = path.join(extractZipFilePath, 'init.js');
        if (!fs.existsSync(pathInit)) {
            console.error(`Init file is missing for : ${info.name}`);
        }

        const pathInitAfter = path.join(extractZipFilePath, 'initAfter.js');
        if (!fs.existsSync(pathInitAfter)) {
            console.error(`InitAfter file is missing for : ${info.name}`);
        }

        const pathRgpd = path.join(extractZipFilePath, 'rgpd.js');
        if (!fs.existsSync(pathRgpd)) {
            console.error(`RGPD file is missing for : ${info.name}`);
        }

        console.log('Module installed');
        if (myModule && myModule.active) {
            console.log(`Updating active module ${myModule.name}`);
            await activateModule(myModule._id, {});
        }
        return newModule;
    } catch (err) {
        try {
            console.log('removing zip file in module folder...');
            await fs.unlink(zipFilePath);
        } catch (err) {
            console.error(err);
        }
        try {
            console.log('removing file in module folder...');
            await fs.deleteRecursive(extractZipFilePath);
        } catch (err) {
            console.error(err);
        }
        throw err;
    }
};

const checkDependenciesAtInstallation = async (idModule) => {
    const myModule = (await Modules.findById(idModule)).toObject();
    const response = {
        toBeChanged : {
            api   : {},
            theme : {}
        },
        alreadyInstalled : {
            api   : {},
            theme : {}
        },
        needUpgrade : false
    };
    if (myModule.packageDependencies && (myModule.packageDependencies.api || myModule.packageDependencies.theme)) {
        const modulesActivated = await Modules.find({_id: {$ne: idModule}, active: true}, 'packageDependencies');
        response.toBeChanged   = modulesUtils.compareDependencies(myModule, modulesActivated, true);

        /**
         * We use npm because yarn currently can't return only installed package
         * from package.json but from all dependencies of all packages
         * @see https://github.com/yarnpkg/yarn/issues/3569
         */
        for (const apiOrTheme of Object.keys(myModule.packageDependencies)) {
            if (myModule.packageDependencies[apiOrTheme]) {
                let savePackagedependenciesPath;
                if (apiOrTheme === 'api') {
                    savePackagedependenciesPath = path.join(global.aquila.appRoot, 'package.json');
                } else if (apiOrTheme === 'theme') {
                    savePackagedependenciesPath = path.join(
                        global.aquila.appRoot,
                        'themes',
                        global.aquila.envConfig.environment.currentTheme,
                        'package.json'
                    );
                }
                const savePackagedependencies = JSON.parse(await fs.readFile(savePackagedependenciesPath));
                for (const [name, version] of Object.entries(savePackagedependencies.dependencies)) {
                    if (response.toBeChanged[apiOrTheme][name]) {
                        response.toBeChanged[apiOrTheme][name].add(version);
                        response.alreadyInstalled[apiOrTheme][name] = version;
                    }
                }
            }
        }
        for (const apiOrTheme of Object.keys(response.toBeChanged)) {
            for (const value of Object.keys(response.toBeChanged[apiOrTheme])) {
                response.toBeChanged[apiOrTheme][value] = [...response.toBeChanged[apiOrTheme][value]];
            }
        }
        for (const apiOrTheme of Object.keys(response.toBeChanged)) {
            for (const value of Object.keys(response.toBeChanged[apiOrTheme])) {
                if (response.toBeChanged[apiOrTheme][value].length > 1 && response.needUpgrade === false) {
                    response.needUpgrade = true;
                    break;
                }
            }
            if (response.needUpgrade) break;
        }
    }
    return response;
};

const checkDependenciesAtUninstallation = async (idModule) => {
    const myModule = (await Modules.findById(idModule)).toObject();
    const response = {
        toBeRemoved : {
            api   : [],
            theme : []
        },
        toBeChanged : {
            api   : {},
            theme : {}
        },
        alreadyInstalled : {
            api   : {},
            theme : {}
        },
        needUpgrade : false
    };
    if (myModule.packageDependencies && (myModule.packageDependencies.api || myModule.packageDependencies.theme)) {
        const modulesActivated = await Modules.find({_id: {$ne: idModule}, active: true}, 'packageDependencies');
        const result           = {
            api   : {},
            theme : {}
        };

        for (const apiOrTheme of Object.keys(myModule.packageDependencies)) {
            for (const [name, version] of Object.entries(myModule.packageDependencies[apiOrTheme])) {
                if (!result[apiOrTheme][name]) {
                    result[apiOrTheme][name] = [];
                }
                result[apiOrTheme][name].push(version);
            }

            for (const pkg of modulesActivated) {
                if (pkg.packageDependencies && pkg.packageDependencies[apiOrTheme]) {
                    for (const [name, version] of Object.entries(pkg.packageDependencies[apiOrTheme])) {
                        if (result[apiOrTheme][name]) {
                            result[apiOrTheme][name].push(version);
                        }
                    }
                }
            }
            for (const [name, versions] of Object.entries(result[apiOrTheme])) {
                if (!response.toBeChanged[apiOrTheme][name]) {
                    if (versions.length > 1) {
                        response.toBeChanged[apiOrTheme][name] = [];
                        response.toBeChanged[apiOrTheme][name].push(...[...new Set(versions)]);
                    } else if (versions.length === 1) {
                        response.toBeRemoved[apiOrTheme].push(name);
                    }
                }
            }
            if (myModule.packageDependencies[apiOrTheme]) {
                let packageDependenciesPath;
                if (apiOrTheme === 'api') {
                    packageDependenciesPath = path.join(global.aquila.appRoot, 'package.json');
                } else if (apiOrTheme === 'theme') {
                    packageDependenciesPath = path.join(
                        global.aquila.appRoot,
                        'themes',
                        global.aquila.envConfig.environment.currentTheme,
                        'package.json'
                    );
                }
                const savePackagedependencies = JSON.parse(await fs.readFile(packageDependenciesPath));
                for (const [name, version] of Object.entries(savePackagedependencies.dependencies)) {
                    if (result[apiOrTheme][name]) {
                        response.alreadyInstalled[apiOrTheme][name] = version.version ? version.version : version;
                    }
                }
            }
            for (const [name, versions] of Object.entries(response.toBeChanged[apiOrTheme])) {
                if (
                    response.alreadyInstalled[name]
                    && versions.indexOf(response.alreadyInstalled[apiOrTheme][name]) === -1
                ) {
                    response.toBeChanged[apiOrTheme][name].push(response.alreadyInstalled[apiOrTheme][name]);
                }
            }
        }
        for (const apiOrTheme of Object.keys(response.toBeChanged)) {
            for (const value of Object.keys(response.toBeChanged[apiOrTheme])) {
                if (response.toBeChanged[apiOrTheme][value].length > 1 && response.needUpgrade === false) {
                    response.needUpgrade = true;
                    break;
                }
            }
            if (response.needUpgrade) break;
        }
    }
    return response;
};

/**
 * Module : copy (back & front) from / modules, activate the module,
 * npm install back (in aquila), npm install for the theme (with active modules)
 * @param {String} idModule mongoose id of the module
 */
const activateModule = async (idModule, toBeChanged) => {
    try {
        const myModule = await Modules.findOne({_id: idModule});
        await modulesUtils.checkModuleDepencendiesAtInstallation(myModule);

        const copy  = `backoffice/app/${myModule.name}`;
        const copyF = `modules/${myModule.name}/app/`;
        let copyTab = [];
        if (await fs.hasAccess(copyF)) {
            try {
                await fs.copyRecursive(
                    path.resolve(global.aquila.appRoot, copyF),
                    path.resolve(global.aquila.appRoot, copy),
                    true
                );
            } catch (err) {
                console.error(err);
            }
            copyTab.push(copy);
        }

        if (myModule.loadTranslationBack) {
            console.log('Loading back translation for module...');
            const src  = path.join('modules', myModule.name, 'translations/back');
            const dest = path.join('backoffice/assets/translations/modules', myModule.name);
            if (await fs.hasAccess(src)) {
                try {
                    await fs.copyRecursive(
                        path.resolve(global.aquila.appRoot, src),
                        path.resolve(global.aquila.appRoot, dest),
                        true
                    );
                } catch (err) {
                    console.error(err);
                }
                copyTab.push(dest);
            }
        }

        // If the module contains dependencies usable in the front or api
        // then we run the install to install the dependencies in aquila
        if (myModule.packageDependencies) {
            await installModulesDependencies(myModule, toBeChanged);
        }

        // All the actions concerning the module that will be performed in the theme
        copyTab = await frontInstallationActions(myModule, toBeChanged, copyTab);

        await myModule.updateOne({$push: {files: copyTab}, active: true});
        console.log('Module activated');
        return Modules.find({}).sort({active: -1, name: 1});
    } catch (err) {
        if (!err.datas) err.datas = {};
        err.datas.modules = await Modules.find({}).sort({active: -1, name: 1});
        throw err;
    }
};

const frontInstallationActions = async (myModule, toBeChanged, copyTab) => {
    const {currentTheme}       = global.aquila.envConfig.environment;
    const themeModuleComponent = await retrieveModuleComponentType(currentTheme);

    if (themeModuleComponent === 'no-installation') {
        console.log(`No component installation is required by this theme (${currentTheme})`);
        return copyTab;
    }
    if (!myModule.component_template_front) {
        console.log(`No component template is defined by this module (${myModule.name})`);
        return copyTab;
    }

    let pathToComponents = 'theme_components';
    if (themeModuleComponent) pathToComponents = path.join(pathToComponents, themeModuleComponent);
    const pathToThemeComponents = path.join(global.aquila.appRoot, 'modules', myModule.name, pathToComponents);

    // Control compatibility between the module and the theme
    if (!fs.existsSync(pathToThemeComponents)) {
        throw NSErrors.IncompatibleModuleComponentType;
    }

    if (myModule.loadTranslationFront) {
        console.log('Front translation for module : Loading ...');
        try {
            const pathToTranslateFile = path.join(global.aquila.appRoot, 'themes', currentTheme, 'assets', 'i18n');
            const hasAccess           = await fs.hasAccess(pathToTranslateFile);
            if (hasAccess) {
                const files      = await fs.readdir(pathToTranslateFile);
                const fileLength = files.length;
                for (let i = 0; i < fileLength; i++) {
                    const lang = files[i];
                    if (lang === 'index.js') {
                        continue;
                    }
                    const src  = path.resolve(global.aquila.appRoot, 'modules', myModule.name, 'translations', 'front', lang);
                    const dest = path.resolve(global.aquila.appRoot, 'themes', currentTheme, 'assets', 'i18n', lang, 'modules', myModule.name);
                    if (await fs.hasAccess(src)) {
                        try {
                            await fs.copyRecursive(src, dest, true);
                        } catch (err) {
                            console.error(err);
                        }
                        copyTab.push(dest);
                    }
                }
            }
            console.log('Front translation for module : Success');
        } catch (errorLoadTranslationFront) {
            console.log('Front translation for module : Failed');
        }
    }

    // If the module must import components into the front
    await addOrRemoveThemeFiles(
        pathToThemeComponents,
        false
    );

    return copyTab;
};

const installModulesDependencies = async (myModule, toBeChanged) => {
    for (const apiOrTheme of Object.keys(toBeChanged)) {
        if (apiOrTheme !== 'theme' && apiOrTheme !== 'api') continue;
        let installPath = global.aquila.appRoot;
        let position    = 'aquila';
        let packagePath = path.resolve(installPath, 'package.json');
        if (apiOrTheme === 'theme') {
            installPath = path.resolve(global.aquila.appRoot, 'themes', global.aquila.envConfig.environment.currentTheme);
            position    = 'the theme';
            packagePath = path.resolve(installPath, 'package.json');
        }
        if (myModule.packageDependencies && myModule.packageDependencies[apiOrTheme]) {
            const packageJSON  = JSON.parse(await fs.readFile(packagePath));
            const dependencies = {
                ...packageJSON.dependencies,
                ...myModule.packageDependencies[apiOrTheme],
                ...toBeChanged[apiOrTheme]
            };
            if (!isEqual(packageJSON.dependencies, dependencies)) {
                packageJSON.dependencies = {
                    ...packageJSON.dependencies,
                    ...myModule.packageDependencies[apiOrTheme],
                    ...toBeChanged[apiOrTheme]
                };
                packageJSON.dependencies = orderPackages(packageJSON.dependencies);
                await fs.writeFile(packagePath, JSON.stringify(packageJSON, null, 2));
                console.log(`Installing dependencies of the module in ${position}...`);
                await execCmd('yarn install', installPath);
                // await execCmd('yarn upgrade', installPath);
            }
        }
    }
};

const installDependencies = async () => {
    // get active modules
    console.log('Modules packageDependecies install start');
    const modules = await getModules({filter: {active: true}, structure: '*', limit: 99, lean: true});
    for (const module of modules.datas) {
        const moduleDependencies = require(path.join((module.path.startsWith('module') ? (`../${module.path}`) :  module.path), 'info.json')).info.packageDependencies;
        if (moduleDependencies) {await installModulesDependencies(module, moduleDependencies);}
    }
    console.log('Modules packageDependecies installed');
    return true;
};

/**
 * Deactivate a module by id and delete file moved
 * to the backoffice and the theme if exists
 * @param {String} idModule
 * @param {{api: {}, theme: {}}} toBeChanged
 * @param {{api: {}, theme: {}}} toBeRemoved
 */
const deactivateModule = async (idModule, toBeChanged, toBeRemoved) => {
    try {
        const _module = (await Modules.findById(idModule)).toObject();
        if (!_module) {
            throw NSErrors.ModuleNotFound;
        }
        await modulesUtils.checkModuleDepencendiesAtUninstallation(_module);
        await removeModuleAddon(_module);

        // Deleting copied files
        for (let i = 0; i < _module.files.length; i++) {
            if (await fs.hasAccess(_module.files[i])) {
                if ((await fs.lstat(_module.files[i])).isDirectory()) {
                    await new Promise((resolve) => {
                        rimraf(_module.files[i], (err) => {
                            if (err) console.error(err);
                            resolve();
                        });
                    });
                } else {
                    try {
                        await fs.unlink(_module.files[i]);
                    } catch (err) {
                        console.error('Error: ', err);
                    }
                }
            }
        }

        await frontUninstallationActions(_module, toBeChanged, toBeRemoved);

        await Modules.updateOne({_id: idModule}, {$set: {files: [], active: false}});
        console.log('Module deactivated');
        return Modules.find({}).sort({active: -1, name: 1});
    } catch (err) {
        if (!err.datas) err.datas = {};
        err.datas.modules = await Modules.find({}).sort({active: -1, name: 1});
        throw err;
    }
};

const frontUninstallationActions = async (_module, toBeChanged, toBeRemoved) => {
    const {currentTheme}       = global.aquila.envConfig.environment;
    const themeModuleComponent = await retrieveModuleComponentType(currentTheme);
    if (themeModuleComponent === 'no-installation') {
        console.log(`No components were required by this theme (${currentTheme})`);
    } else {
        let pathToComponents = 'theme_components';
        if (themeModuleComponent) pathToComponents = path.join(pathToComponents, themeModuleComponent);
        const pathToThemeComponents = path.join(global.aquila.appRoot, _module.path, pathToComponents);
        await addOrRemoveThemeFiles(
            pathToThemeComponents,
            true
        );
        console.log('Removing dependencies of the module...');
        // Remove the dependencies of the module
        if (_module.packageDependencies) {
            for (const apiOrTheme of Object.keys(_module.packageDependencies)) {
                let installPath;
                let savePackagedependenciesPath;
                let packagePath;
                if (apiOrTheme === 'api') {
                    installPath                 = global.aquila.appRoot;
                    savePackagedependenciesPath = path.join(global.aquila.appRoot, 'package-aquila.json');
                    packagePath                 = path.resolve(installPath, 'package.json');
                } else if (apiOrTheme === 'theme') {
                    installPath                 = path.resolve(
                        global.aquila.appRoot,
                        'themes',
                        global.aquila.envConfig.environment.currentTheme
                    );
                    savePackagedependenciesPath = path.join(installPath, 'package-theme.json');
                    packagePath                 = path.resolve(installPath, 'package.json');
                }
                const savePackagedependencies = JSON.parse(await fs.readFile(savePackagedependenciesPath));
                const packageJSON             = JSON.parse(await fs.readFile(packagePath));
                packageJSON.dependencies      = {
                    ...packageJSON.dependencies,
                    ...toBeChanged[apiOrTheme]
                };
                for (const packageToDelete of toBeRemoved[apiOrTheme]) {
                    delete packageJSON.dependencies[packageToDelete];
                }
                for (const [name, version] of Object.entries(savePackagedependencies.dependencies)) {
                    let found = false;
                    for (const [name2] of Object.entries(packageJSON.dependencies)) {
                        if (name === name2) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) packageJSON.dependencies[name] = version;
                }

                packageJSON.dependencies = orderPackages(packageJSON.dependencies);
                await fs.writeFile(packagePath, JSON.stringify(packageJSON, null, 2));
                await execCmd('yarn install', installPath);
                // await execCmd('yarn upgrade', installPath);
            }
        }
    }
};

const orderPackages = (dependencies) => {
    const ordered = {};
    for (const pkg of Object.keys(dependencies).sort()) {
        ordered[pkg] = dependencies[pkg];
    }
    return ordered;
};

/**
 * Delete module (if active, don't remove it): delete files in /modules, remove in DB
 * @param {string} id id of the module
 */
const removeModule = async (idModule) => {
    const module = await Modules.findOne({_id: idModule});

    const path = module.path;
    console.log('Removing module in database');
    await Modules.deleteOne({_id: idModule});

    console.log('Removing modules files');
    try {
        await fs.unlink(path.replace(/\/$/, '.zip'));
    } catch (err) {
        console.error(err);
    }
    rimraf(path, (err) => {
        if (err) console.error('Error: ', err);
    });
    return true;
};

const retrieveModuleComponentType = async (theme) => {
    const themeInfo = await utilsThemes.loadThemeInfo(theme);
    if (themeInfo?.moduleComponentType) return themeInfo.moduleComponentType;
    return '';
};

/**
 * Checks the type of module component the theme expects
 * If a module path is not filled in, this means that all modules registered in the database must be installed (as in the case of a theme change)
 * @param {*} theme : theme
 * @param {*} pathModule : module path
 */
const frontModuleComponentManagement = async (theme, modulePath) => {
    const themeModuleComponent = await retrieveModuleComponentType(theme);
    if (themeModuleComponent === 'no-installation') {
        console.log('No component installation is required by this theme');
    } else {
        if (modulePath) {
            await setFrontModuleInTheme(modulePath, theme);
        } else {
            await setFrontModules(theme);
        }
    }
};

/**
 * Module : Before loading front's module, need to create '\themes\ {theme_name}\modules\list_modules.js'and populate it
 */
const setFrontModules = async (theme) => {
    console.log("Set module's front files : Loading ...");
    // Create the file if it does not exist, or reinit of the file
    await modulesUtils.createListModuleFile(theme || global.aquila.envConfig.environment.currentTheme);

    // Update file content (from modules)
    const listModules = await Modules.find({active: true/* , "et need front" */});
    for (let index = 0; index < listModules.length; index++) {
        const oneModule = listModules[index];

        // Does this module contain a front?
        const modulePath = path.join(global.aquila.appRoot, oneModule.path);
        if (await fs.hasAccess(modulePath)) {
            // Write the file if it's not already in it
            await setFrontModuleInTheme(modulePath, theme || global.aquila.envConfig.environment.currentTheme);
        }
    }
    console.log("Set module's front files : Done");
};

/**
 * Add in the file /{myfront}/modules/list_modules.js the import(s) allowing to use the front of the module in the theme
 * @param {*} pathModule : module path
 * @param {*} theme : theme
 */
const setFrontModuleInTheme = async (pathModule, theme) => {
    let savePath              = pathModule.replace('theme_components', '');
    const moduleComponentType = await retrieveModuleComponentType(theme);
    if (moduleComponentType !== '') savePath = savePath.replace(moduleComponentType, '');

    if (pathModule.lastIndexOf('theme_components') === -1) {
        pathModule = path.join(pathModule, 'theme_components');
    }
    if (!pathModule.endsWith('/')) {
        pathModule = path.join(pathModule, '/');
    }

    if (moduleComponentType !== '' && pathModule.lastIndexOf(moduleComponentType) === -1) pathModule = path.join(pathModule, moduleComponentType, '/');

    // Check if the module component type exists in the theme_components folder
    const hasAccess = await fs.hasAccess(pathModule);
    if (!hasAccess) {
        return;
    }

    const currentTheme       = theme || global.aquila.envConfig.environment.currentTheme; // serviceTheme.getThemePath(); // Bug
    const pathToThemeModules = path.join(global.aquila.appRoot, 'themes', currentTheme, 'modules');

    const info       = await fs.readFile(path.join(savePath, 'info.json'));
    const parsedInfo = JSON.parse(info);

    const moduleFolderInTheme = path.join(pathToThemeModules, parsedInfo.info.name);
    if (!fs.existsSync(moduleFolderInTheme)) {
        fs.mkdirSync(moduleFolderInTheme);
    }

    const pathListModules = path.join(pathToThemeModules, 'list_modules.js');

    // For each module front file
    const resultDir = await fs.readdir(pathModule, {withFileTypes: true});
    const filesList = resultDir.filter((file) => file.isFile());
    for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i].name;
        let type   = parsedInfo?.info?.type ? parsedInfo.info.type : '';
        if (parsedInfo.info.types && Array.isArray(parsedInfo.info.types)) {
            type = parsedInfo.info.types.find((t) => t.component === file)?.type;
        }
        if (type === undefined || type === null) {
            type = '';
        }
        const fileNameWithoutModule = file.replace('.js', '').toLowerCase(); // ComponentName.js -> componentname
        const jsxModuleToImport     = `{jsx: require('./${parsedInfo.info.name}/${file}'), code: 'aq-${fileNameWithoutModule}', type: '${type}'},`;
        const result                = await fs.readFile(pathListModules, 'utf8');

        // file don't contain module name
        if (result.indexOf(fileNameWithoutModule) <= 0) {
            // eslint-disable-next-line prefer-regex-literals
            const regexArray            = new RegExp(/\[[^]*?\]/, 'gm');
            let exportDefaultListModule = '';
            const match                 = result.match(regexArray);
            if (match && match.length > 0) {
                exportDefaultListModule = match[0];
            }
            const replaceListModules = `export default ${exportDefaultListModule.slice(0, exportDefaultListModule.lastIndexOf(']'))}${jsxModuleToImport}]`;
            await fs.writeFile(pathListModules, replaceListModules, {flags: 'w'});
        }

        // Copy the files (of the module) needed by the front
        const copyTo  = path.join(moduleFolderInTheme, file);
        const copyTab = [
            copyTo
        ];
        // Set the theme components files for each theme to be able to delete them
        await Modules.updateOne({path: savePath}, {$push: {files: copyTab}});
        fs.copyFileSync(pathModule + file, copyTo);
        console.log(`Copy module's files front : ${pathModule + file} -> ${copyTo}`);
    }

    // Add the rest of the folders and files
    if (moduleComponentType && moduleComponentType !== 'no-installation') {
        for (let i = 0; i < resultDir.length; i++) {
            const thisDir = path.join(moduleFolderInTheme, resultDir[i].name);
            if (!fs.existsSync(thisDir)) {
                await fs.copyRecursive(pathModule + resultDir[i].name, thisDir);
            }
        }
    }
};

/**
 * Add or delete a front's module
 * @param {string} pathThemeComponents path to the front component of the module. ie: "modules/my-module-aquila/theme_components"
 * @param {boolean} toRemove if true then we delete the files in "themes/currentTheme/modules" and "themes/currentTheme/list_modules"
 */
const addOrRemoveThemeFiles = async (pathThemeComponents, toRemove) => {
    // Check if the theme_components folder exists in the module, then it's a front module
    if (!fs.existsSync(pathThemeComponents)) {
        return;
    }
    const currentTheme = global.aquila.envConfig.environment.currentTheme;
    if (toRemove) {
        const pathThemeComponentsArray = slash(pathThemeComponents).split('/');
        let moduleName                 = pathThemeComponentsArray[pathThemeComponentsArray.length - 2]; // Historic path with no sub-folder in theme_components
        if (moduleName === 'theme_components') moduleName = pathThemeComponentsArray[pathThemeComponentsArray.length - 3]; // New path with a sub-folder for each possible technology

        // Remove all component files (especially from the list_modules.js file)
        const listOfDir  = await fs.readdir(pathThemeComponents, {withFileTypes: true});
        const listOfFile = listOfDir.filter((file) => file.isFile());
        for (const file of listOfFile) {
            const fileName = file.name;
            await removeFromListModule(fileName, currentTheme);
            let filePath = path.join(global.aquila.appRoot, 'themes', currentTheme, 'modules', fileName);
            if (!fs.existsSync(filePath)) filePath = path.join(global.aquila.appRoot, 'themes', currentTheme, 'modules', moduleName, fileName); // The new way
            if (fs.existsSync(filePath)) {
                try {
                    await fs.unlink(filePath);
                    console.log(`Delete ${filePath}`);
                } catch (err) {
                    console.log(`Cannot delete ${filePath}`);
                }
            }
        }

        const moduleFolderInTheme = path.join(global.aquila.appRoot, 'themes', currentTheme, 'modules', moduleName);
        if (fs.existsSync(moduleFolderInTheme)) {
            fs.rmSync(moduleFolderInTheme, {recursive: true, force: true});
            console.log(`Delete ${moduleFolderInTheme}`);
        }
    } else {
        await frontModuleComponentManagement(currentTheme, pathThemeComponents);
    }

    // Rebuild du theme
    if (getEnv('NODE_ENV') === 'production') {
        await themesService.buildTheme(currentTheme);
    }
};

/**
 * Function allowing to delete an import in themes/${currentTheme}/modules/list_modules.js
 * @param {*} jsxModuleToImport { jsx: require('./ModuleMonModule.js').default, code: 'aq-monmodule' },
 * @param {*} exportDefaultListModule [{ jsx: require('./ModuleMonModule1.js').default, code: 'aq-monmodule1' }, ...]
 * @param {*} pathListModules themes/${currentTheme}/modules/list_modules.js`
 */
const removeImport = async (thisModuleElement, exportDefaultListModule, pathListModules) => {
    const result = exportDefaultListModule.replace(thisModuleElement, '');
    await fs.writeFile(pathListModules, result);
};

const removeFromListModule = async (file, currentTheme) => {
    try {
        const pathListModules = path.join(global.aquila.appRoot, 'themes', currentTheme, 'modules/list_modules.js');
        if (fs.existsSync(pathListModules)) {
            const result            = await fs.readFile(pathListModules, 'utf8');
            const thisModuleElement = new RegExp(`{[^{]*${file}[^}]*},`, 'gm');
            await removeImport(thisModuleElement, result, pathListModules);
        }
    } catch (error) {
        console.error(error);
    }
};

/**
 * call uninit in _module, remove cronNames and mailTypeCode
 * @param {Modules} _module
 */
const removeModuleAddon = async (_module) => {
    if (!_module) return;
    const uninit = path.join(global.aquila.appRoot, _module.path, 'uninit.js');
    if (fs.existsSync(uninit)) {
        try {
            await new Promise((resolve, reject) => {
                require(uninit)(resolve, reject);
            });
        } catch (error) {
            if (error.code !== 'MODULE_NOT_FOUND') throw error;
        }
    }
    // If it is a module containing a job then we delete the job in the agendaJobs collection
    if (_module.cronNames && _module.cronNames.length > 0) {
        for (const cronName of _module.cronNames) {
            try {
                await require('./job').deleteModuleJobByName(cronName);
            } catch (err) {
                console.error(`Unable to delete the job '${cronName}'`);
            }
        }
    }
    if (_module.mailTypeCode && _module.mailTypeCode.length > 0) {
        for (const mailCode of _module.mailTypeCode) {
            try {
                await require('./mailType').deleteMailType(mailCode, false);
            } catch (err) {
                console.error(err);
            }
        }
    }
};

const initComponentTemplate = async (model, component, moduleName) => {
    const elements = await mongoose.model(model).find({$or: [{component_template: {$regex: `^((?!${component}).)*$`, $options: 'm'}}, {component_template: undefined}]}).select('_id component_template').lean();
    for (const elem of elements) {
        if (!elem.component_template || !elem.component_template.includes(component)) {
            let newComponentTemplate = elem.component_template || '';
            newComponentTemplate    += component;
            await mongoose.model(model).updateOne(
                {_id: elem._id},
                {$set: {component_template: newComponentTemplate}}
            );
        }
    }
    console.log(`${moduleName}: Added field component_template = ${component} number of fields added: ${elements.length}`);
};

const uninitComponentTemplate = async (model, component, moduleName, field) => {
    const elements = await mongoose.model(model).find({});
    for (const elem of elements) {
        let newComponentTemplate = elem.component_template || '';
        newComponentTemplate     = newComponentTemplate.replace(component, '');
        await mongoose.model(model).updateOne(
            {_id: elem._id},
            {$unset: {[field]: ''}, $set: {component_template: newComponentTemplate}}
        );
    }
    console.log(`${moduleName}: Delete field component_template = ${component} number of fields deleted: ${elements.length}`);
};

/**
 * Load modules for admin
 */
const loadAdminModules = async () => {
    const modules = await Modules.find({active: true, loadApp: true});
    if (!modules) {
        throw NSErrors.NotFound;
    }
    const tabM = [];
    for (const oneModule of modules) {
        const item = {module: oneModule.name, files: []};
        try {
            const pathToModule = path.join(global.aquila.appRoot, 'backoffice', 'app', oneModule.name);
            const hasAccess    = await fs.hasAccess(pathToModule);
            if (!hasAccess) {
                throw `Can't access to ${pathToModule}`;
            }
            const listOfFiles = await fs.readdir(pathToModule);
            for (const files of listOfFiles) {
                if (files.endsWith('.js')) {
                    item.files.push(files);
                }
            }
            tabM.push(item);
        } catch (err) {
            console.error(`Could not load module ${oneModule.name}`);
            console.error(err);

            await require('./admin').insertAdminInformation({
                code        : `module_${oneModule.name}_missing`,
                type        : 'danger',
                translation : {
                    en : {
                        title : 'Module missing',
                        text  : `The module <b>${oneModule.name}</b> is installed, but his files are missing`
                    },
                    fr : {
                        title : 'Module manquant',
                        text  : `Le module <b>${oneModule.name}</b> est installé, mais ces fichiers sont manquant`
                    }
                }
            });
        }
    }
    return tabM;
};

/**
 * Used to retrieve the configuration (conf field) of a module
 * @param {string} name (string) module name / code
 * @returns Returns the module configuration
 */
const getConfig = async (name) => {
    const _module = await Modules.findOne({name});
    return _module ? _module.config : undefined;
};

/**
 * Set the configuration (conf field) of a module
 * @param name {string} module name / code
 * @param newConfig {object} the new configuration
 * @returns {Promise<*>} Returns the new module configuration
 */
const setConfig = async (name, newConfig) => {
    const configToSave = {config: newConfig};
    await aquilaEvents.emit(`changePluginConfig_${name}`, configToSave);
    const correctConfigToSave = configToSave.config || {};
    await Modules.updateOne({name}, {$set: {config: correctConfigToSave}}, {new: true});
    return getConfig(name);
};

/**
 * Used to define the configuration (conf field) of a module
 * @param body {object} datas of the request it has moduleName key (required) and 2 optionnals keys: filename which is the name of the file you wanna point to (default README.md), and encoding which is the file encoding (default utf8)
 * @returns {Promise<*>} Returns the content of the md file corresponding to the name of the module
 */
const getModuleMd = async (body) => {
    if (!body.moduleName) {
        throw NSErrors.InvalidParameters;
    }
    const pathToMd = path.join(global.aquila.appRoot, 'modules', body.moduleName, body.filename || 'README.md');
    if (await fs.existsSync(pathToMd)) {
        return fs.readFileSync(pathToMd, body.encoding || 'utf8');
    }
    return '';
};

module.exports = {
    getModules,
    getModule,
    setModuleConfigById,
    initModule,
    checkDependenciesAtInstallation,
    checkDependenciesAtUninstallation,
    activateModule,
    installDependencies,
    deactivateModule,
    removeModule,
    frontModuleComponentManagement,
    // setFrontModules, DEPRECATED : you have to go through the frontModuleComponentManagement function
    // setFrontModuleInTheme, DEPRECATED : you have to go through the frontModuleComponentManagement function
    addOrRemoveThemeFiles,
    removeImport,
    removeFromListModule,
    removeModuleAddon,
    initComponentTemplate,
    uninitComponentTemplate,
    loadAdminModules,
    getConfig,
    setConfig,
    getModuleMd
};