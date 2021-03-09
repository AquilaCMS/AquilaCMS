/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const AdmZip         = require('adm-zip');
const path           = require('path');
const mongoose       = require('mongoose');
const rimraf         = require('rimraf');
const semver         = require('semver');
const packageManager = require('../utils/packageManager');
const QueryBuilder   = require('../utils/QueryBuilder');
const modulesUtils   = require('../utils/modules');
const serverUtils    = require('../utils/server');
const fs             = require('../utils/fsp');
const NSErrors       = require('../utils/errors/NSErrors');
const {Modules}      = require('../orm/models');
const themesService  = require('./themes');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Modules, restrictedFields, defaultFields);

/**
 * retourne les modules en fonction du PostBody
 */
const getModules = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

/**
 * retourne le module en fonction du PostBody
 */
const getModule = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

/**
 * Permet de modifier la configuration (champ conf) d'un module
 * @param body : body de la requête, il permettra de mettre à jour la configuration du module
 * @param _id : string : ObjectId de la configuration du module a modifié
 * @returns Retourne la configuration du module la review venant d'étre modifié
 */
const setModuleConfigById = async (_id, config) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
    // Si un changement est effectué sur un document actif alors on désactive les autres
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
const initModule = async (zipFile) => {
    const {originalname, path: filepath} = zipFile;
    if (path.extname(originalname) !== '.zip') {
        throw NSErrors.InvalidFile;
    }
    console.log('Upload module...');
    const moduleFolder       = 'modules/';
    const zipFilePath        = `${moduleFolder}${originalname}`;
    const extractZipFilePath = zipFilePath.replace('.zip', '/');

    // move the file from the temporary location to the intended location
    await fs.mkdir(path.resolve(global.appRoot, moduleFolder), {recursive: true});
    await fs.copyFile(
        path.resolve(global.appRoot, filepath),
        path.resolve(global.appRoot, zipFilePath)
    );
    await fs.unlink(path.resolve(global.appRoot, filepath));

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
            const packageAquila = (await fs.readFile(path.resolve(global.appRoot, 'package.json'), 'utf8')).toString();
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
            throw NSErrors.ModuleMainFolder;
            // throw new Error('missing main folder in zip');
        }
        console.log('Unziping module...');
        await new Promise((resolve, reject) => {
            zip.extractAllToAsync(moduleFolder, true, (err) => {
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
            path                     : extractZipFilePath,
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
            versionAquila            : info.versionAquila,
            active                   : !!(myModule && myModule.active)
        }, {upsert: true, new: true});

        // On teste si les fonctions init, initAfter, uninit et rgpd sont présentes
        const pathUninit = path.join(global.appRoot, extractZipFilePath, 'uninit.js');
        if (!fs.existsSync(pathUninit)) {
            console.error(`Uninit file is missing for : ${info.name}`);
        }

        const pathInit = path.join(global.appRoot, extractZipFilePath, 'init.js');
        if (!fs.existsSync(pathInit)) {
            console.error(`Init file is missing for : ${info.name}`);
        }

        const pathInitAfter = path.join(global.appRoot, extractZipFilePath, 'initAfter.js');
        if (!fs.existsSync(pathInitAfter)) {
            console.error(`InitAfter file is missing for : ${info.name}`);
        }

        const pathRgpd = path.join(global.appRoot, extractZipFilePath, 'rgpd.js');
        if (!fs.existsSync(pathRgpd)) {
            console.error(`RGPD file is missing for : ${info.name}`);
        }

        console.log('Module installed');
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
            await fs.deleteRecursiveSync(extractZipFilePath);
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
                    savePackagedependenciesPath = path.join(global.appRoot, 'package.json');
                } else if (apiOrTheme === 'theme') {
                    savePackagedependenciesPath = path.join(
                        global.appRoot,
                        'themes',
                        global.envConfig.environment.currentTheme,
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
                    packageDependenciesPath = path.join(global.appRoot, 'package.json');
                } else if (apiOrTheme === 'theme') {
                    packageDependenciesPath = path.join(
                        global.appRoot,
                        'themes',
                        global.envConfig.environment.currentTheme,
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
 * Module : copie (back & front) depuis /modules, mettre en actif le module,
 * npm install back (dans aquila), npm install du theme (avec les modules actifs)
 * @param {String} idModule mongoose id of the module
 */
const activateModule = async (idModule, toBeChanged) => {
    try {
        const myModule = await Modules.findOne({_id: idModule});
        await modulesUtils.checkModuleDepencendiesAtInstallation(myModule);

        const copy    = path.resolve(`backoffice/app/${myModule.name}`);
        const copyF   = path.resolve(`modules/${myModule.name}/app/`);
        const copyTab = [];
        if (await fs.hasAccess(copyF)) {
            try {
                await fs.copyRecursiveSync(
                    path.resolve(global.appRoot, copyF),
                    path.resolve(global.appRoot, copy),
                    true
                );
            } catch (err) {
                console.error(err);
            }
            copyTab.push(copy);
        }

        if (myModule.loadTranslationBack) {
            console.log('Loading back translation for module...');
            const src  = path.resolve('modules', myModule.name, 'translations/back');
            const dest = path.resolve('backoffice/assets/translations/modules', myModule.name);
            if (await fs.hasAccess(src)) {
                try {
                    await fs.copyRecursiveSync(
                        path.resolve(global.appRoot, src),
                        path.resolve(global.appRoot, dest),
                        true
                    );
                } catch (err) {
                    console.error(err);
                }
                copyTab.push(dest);
            }
        }

        if (myModule.loadTranslationFront) {
            console.log('Loading front translation for module...');
            const {currentTheme} = global.envConfig.environment;
            const files          = await fs.readdir(`themes/${currentTheme}/assets/i18n/`, 'utf-8');
            for (let i = 0; i < files.length; i++) {
                const src  = path.resolve('modules', myModule.name, 'translations/front', files[i]);
                const dest = path.resolve('themes', currentTheme, 'assets/i18n', files[i], 'modules', myModule.name);
                if (await fs.hasAccess(src)) {
                    try {
                        await fs.copyRecursiveSync(src, dest, true);
                    } catch (err) {
                        console.error(err);
                    }
                    copyTab.push(dest);
                }
            }
        }

        // Si le module contient des dépendances utilisable dans le front
        // alors on lance l'install pour installer les dépendances dans aquila
        if (myModule.packageDependencies) {
            for (const apiOrTheme of Object.keys(toBeChanged)) {
                let installPath = global.appRoot;
                let position    = 'aquila';
                let packagePath = path.resolve(installPath, 'package.json');
                if (apiOrTheme === 'theme') {
                    installPath = path.resolve(global.appRoot, 'themes', global.envConfig.environment.currentTheme);
                    position    = 'the theme';
                    packagePath = path.resolve(installPath, 'package.json');
                }
                if (myModule.packageDependencies[apiOrTheme]) {
                    const packageJSON        = JSON.parse(await fs.readFile(packagePath));
                    packageJSON.dependencies = {
                        ...packageJSON.dependencies,
                        ...myModule.packageDependencies[apiOrTheme],
                        ...toBeChanged[apiOrTheme]
                    };

                    packageJSON.dependencies = orderPackages(packageJSON.dependencies);
                    await fs.writeFile(packagePath, JSON.stringify(packageJSON, null, 2));
                    console.log(`Installing dependencies of the module in ${position}...`);
                    await packageManager.execCmd('yarn install', installPath);
                    await packageManager.execCmd('yarn upgrade', installPath);
                }
            }
        }

        // Si le module doit importer des composants dans le front
        await addOrRemoveThemeFiles(
            path.resolve(global.appRoot, 'modules', myModule.name, 'theme_components'),
            false,
            myModule.type ? `type: '${myModule.type}'` : ''
        );
        await myModule.updateOne({$push: {files: copyTab}, active: true});
        console.log('Module activated');
        return Modules.find({}).sort({active: -1, name: 1});
    } catch (err) {
        if (!err.datas) err.datas = {};
        err.datas.modules = await Modules.find({}).sort({active: -1, name: 1});
        throw err;
    }
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
        try {
            await addOrRemoveThemeFiles(
                path.resolve(global.appRoot, _module.path, 'theme_components'),
                true,
                _module.type ? `type: '${_module.type}'` : ''
            );
        } catch (error) {
            console.error(error);
        }

        // Suppression des fichiers copiés
        for (let i = 0; i < _module.files.length; i++) {
            if (await fs.hasAccess(_module.files[i])) {
                if ((await fs.lstat(_module.files[i])).isDirectory()) {
                    await new Promise((resolve) => rimraf(_module.files[i], (err) => {
                        if (err) console.error(err);
                        resolve();
                    }));
                } else {
                    try {
                        await fs.unlink(_module.files[i]);
                    } catch (err) {
                        console.error('Error: ', err);
                    }
                }
            }
        }

        console.log('Removing dependencies of the module...');
        // On supprime les dépendances du module
        if (_module.packageDependencies) {
            for (const apiOrTheme of Object.keys(_module.packageDependencies)) {
                let installPath;
                let savePackagedependenciesPath;
                let packagePath;
                if (apiOrTheme === 'api') {
                    installPath                 = global.appRoot;
                    savePackagedependenciesPath = path.join(global.appRoot, 'package-aquila.json');
                    packagePath                 = path.resolve(installPath, 'package.json');
                } else if (apiOrTheme === 'theme') {
                    installPath                 = path.resolve(
                        global.appRoot,
                        'themes',
                        global.envConfig.environment.currentTheme
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
                await packageManager.execCmd('yarn install', installPath);
                await packageManager.execCmd('yarn upgrade', installPath);
            }
        }

        await Modules.updateOne({_id: idModule}, {$set: {files: [], active: false}});
        console.log('Module desactivated');
        return Modules.find({}).sort({active: -1, name: 1});
    } catch (err) {
        if (!err.datas) err.datas = {};
        err.datas.modules = await Modules.find({}).sort({active: -1, name: 1});
        throw err;
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
 * Module : supression module (si actif, bloquer la suppression) : supprime fichiers dans /modules, remove en BDD
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

/**
 * Module : Before loading front's module, need to create '\themes\ {theme_name}\modules\list_modules.js'and populate it
 */
const setFrontModules = async (theme) => {
    console.log('Set module\'s front files...');
    // Création du fichier s'il n'existe pas, ou reinit du fichier
    await modulesUtils.createListModuleFile(theme || global.envConfig.environment.currentTheme);

    // Mettre à jour le contenu du fichier par rapport aux modules
    const listModules = await Modules.find({active: true/* , "et need front" */});

    for (let index = 0; index < listModules.length; index++) {
        const oneModule = listModules[index];

        // Est ce que ce module comprend du front ?
        if (await fs.hasAccess(`./${oneModule.path}`)) {
            // Ecrire dans le fichier s'il n'est pas déjà dedans
            await setFrontModuleInTheme(oneModule.path, theme || global.envConfig.environment.currentTheme);
        }
    }
};

/**
 * Permet d'ajouter dans le fichier montheme/modules/list_modules.js le ou les import(s) permettant d'utiliser le front du module sur le theme
 * @param {*} pathModule : chemin du module
 * @param {*} theme : theme
 */
const setFrontModuleInTheme = async (pathModule, theme) => {
    const savePath = pathModule.replace('theme_components', '');
    console.log(`Set module's front files... ${pathModule}`);

    if (pathModule.lastIndexOf('theme_components') === -1) {
        pathModule += 'theme_components/';
    }
    if (!pathModule.endsWith('/')) {
        pathModule += '/';
    }

    // On regarde si le dossier theme_components existe dans le module, si c'est le cas, alors c'est un module front
    if (!await fs.hasAccess(pathModule)) return;
    const currentTheme = theme || global.envConfig.environment.currentTheme; // serviceTheme.getThemePath(); // Bug
    const resultDir    = await fs.readdir(pathModule);

    // Pour chaque fichier front du module
    for (let i = 0; i < resultDir.length; i++) {
        const file = resultDir[i];
        if (!file.startsWith('Module') || !file.endsWith('.js')) {
            continue;
        }
        const info                  = await fs.readFile(path.resolve(savePath, 'info.json'));
        let type                    = JSON.parse(info).info.type;
        type                        = type ? `type: '${type}'` : '';
        const fileNameWithoutModule = file.replace('Module', '').replace('.js', '').toLowerCase(); // ModuleNomComposant.js -> nomcomposant
        const jsxModuleToImport     = `{ jsx: require('./${file}'), code: 'aq-${fileNameWithoutModule}', ${type} },`;
        const pathListModules       = path.resolve(`themes/${currentTheme}/modules/list_modules.js`);
        const result                = await fs.readFile(pathListModules, 'utf8');

        // file don't contain module name
        if (result.indexOf(fileNameWithoutModule) <= 0) {
            const exportDefaultListModule = result.match(new RegExp(/\[(.*?)\]/, 'g'))[0];
            const replaceListModules      = `export default ${exportDefaultListModule.slice(0, exportDefaultListModule.lastIndexOf(']'))} ${jsxModuleToImport}]`;
            await fs.writeFile(pathListModules, replaceListModules, {flags: 'w'});
        }

        // Copier les fichiers (du module) necessaire aux front
        const copyTo  = `./themes/${currentTheme}/modules/${file}`;
        const copyTab = [`themes/${currentTheme}/modules/${file}`];
        // ON enregistre les fichiers theme components pour chaque theme pour pouvoir les supprimer
        await Modules.updateOne({path: savePath}, {$push: {files: copyTab}});
        fs.copyFileSync(pathModule + file, copyTo);
        console.log(`Copy module's files front : ${pathModule + file} -> ${copyTo}`);
    }
};

/**
 * Fonction permettant de gérer l'ajout ou la suppression d'un module front
 * @param {string} pathThemeComponents chemin vers le composant front du module ex: "modules/mon-module-aquila/theme_components"
 * @param {boolean} toRemove si true alors on supprime les fichiers de "themes/currentTheme/modules" ainsi que de "themes/currentTheme/list_modules"
 */
const addOrRemoveThemeFiles = async (pathThemeComponents, toRemove, type) => {
    // On regarde si le dossier theme_components existe dans le module, si c'est le cas, alors c'est un module front
    if (!fs.existsSync(pathThemeComponents)) return;
    const currentTheme = global.envConfig.environment.currentTheme;
    for (const file of await fs.readdir(pathThemeComponents)) {
        if (!file.startsWith('Module') || !file.endsWith('.js')) continue;
        if (toRemove) {
            const fileNameWithoutModule = file.replace('Module', '')
                .replace('.js', '')
                .toLowerCase();
            await removeFromListModule(file, currentTheme, fileNameWithoutModule, type);
            const filePath = path.resolve(global.appRoot, 'themes', currentTheme, 'modules', file);
            if (fs.existsSync(filePath)) {
                try {
                    await fs.unlink(filePath);
                    console.log(`rm ${filePath}`);
                } catch (err) {
                    console.log(`cannot rm ${filePath}`);
                }
            }
        } else {
            await setFrontModuleInTheme(pathThemeComponents, currentTheme);
        }
    }
    // Rebuild du theme
    if (serverUtils.getEnv('NODE_ENV') === 'production') {
        await themesService.buildTheme(currentTheme);
    }
};

/**
 * Fonction permettant de supprimer un import dans themes/${currentTheme}/modules/list_modules.js
 * @param {*} jsxModuleToImport { jsx: require('./ModuleMonModule.js').default, code: 'aq-monmodule' },
 * @param {*} exportDefaultListModule [{ jsx: require('./ModuleMonModule1.js').default, code: 'aq-monmodule1' }, ...]
 * @param {*} pathListModules themes/${currentTheme}/modules/list_modules.js`
 */
const removeImport = async (jsxModuleToImport, exportDefaultListModule, pathListModules) => {
    // On supprime les espaces
    const objectToRemove = jsxModuleToImport.replace(/\s+/g, '');
    // On supprime les espaces des infos contenus dans le tableau de l'export
    exportDefaultListModule = exportDefaultListModule.replace(/\s+/g, '');
    // On replace par "" l'objet a supprimer de fichier
    const result = exportDefaultListModule.replace(objectToRemove, '');
    await fs.writeFile(pathListModules, `export default ${result}`);
};

const removeFromListModule = async (file, currentTheme, fileNameWithoutModule, type) => {
    try {
        const pathListModules = path.resolve('themes', currentTheme, 'modules/list_modules.js');
        if (fs.existsSync(pathListModules)) {
            const result                  = await fs.readFile(pathListModules, 'utf8');
            const jsxModuleToImport       = `{ jsx: require('./${file}'), code: 'aq-${fileNameWithoutModule}', ${type} },`;
            const exportDefaultListModule = result.match(new RegExp(/\[(.*?)\]/, 'g'))[0];
            await removeImport(jsxModuleToImport, exportDefaultListModule, pathListModules);
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
    const uninit = path.join(global.appRoot, _module.path, 'uninit.js');
    if (fs.existsSync(uninit)) {
        try {
            await new Promise((resolve, reject) => {
                require(uninit)(resolve, reject);
            });
        } catch (error) {
            if (error.code !== 'MODULE_NOT_FOUND') throw error;
        }
    }
    // Si c'est un module contenant un job alors on supprime le job dans la collection agendaJobs
    if (_module.cronNames && _module.cronNames.length > 0) {
        for (const cronName of _module.cronNames) {
            try {
                await require('./job').deleteModuleJobByName(cronName);
            } catch (err) {
                console.error(err);
            }
        }
    }
    if (_module.mailTypeCode && _module.mailTypeCode.length > 0) {
        for (const mailCode of _module.mailTypeCode) {
            try {
                await require('./mailType').deleteMailType(mailCode);
            } catch (err) {
                console.error(err);
            }
        }
    }
};

const initComponentTemplate = async (model, component, moduleName) => {
    const elements = await mongoose.model(model).find({});
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
    for (const module of modules) {
        const item = {module: module.name, files: []};
        try {
            for (const files of await fs.readdir(path.resolve(`backoffice/app/${module.name}`))) {
                if (files.endsWith('.js')) {
                    item.files.push(files);
                }
            }
            tabM.push(item);
        } catch (err) {
            console.error(`Could not load module ${module.name}`);
            console.error(err);

            await require('./admin').insertAdminInformation({
                code        : `module_${module.name}_missing`,
                type        : 'danger',
                translation : {
                    en : {
                        title : 'Module missing',
                        text  : `The module <b>${module.name}</b> is installed, but his files are missing`
                    },
                    fr : {
                        title : 'Module manquant',
                        text  : `Le module <b>${module.name}</b> est installé, mais ces fichiers sont manquant`
                    }
                }
            });
        }
    }

    return tabM;
};

/**
 * Permet récupérer la configuration (champ conf) d'un module
 * @param {string} name (string) nom/code du module
 * @returns Retourne la configuration du module
 */
const getConfig = async (name) => {
    const _module = await Modules.findOne({name});
    return _module ? _module.config : undefined;
};

/**
 * Permet définir la configuration (champ conf) d'un module
 * @param name {string} nom/code du module
 * @param newConfig {object} la nouvelle configuration
 * @returns {Promise<*>} Retourne la nouvelle configuration du module
 * @deprecated
 */
const setConfig = async (name, newConfig) => {
    return Modules.updateOne({name}, {$set: {config: newConfig}}, {new: true});
};

/**
 * Permet définir la configuration (champ conf) d'un module
 * @param body {object} corp de la requete
 * @returns {Promise<*>} Retourne le contenu du fichier md corespondant au nom du module fourni
 * @deprecated
 */
const getModuleMd = async (body) => {
    if (!body.moduleName) throw NSErrors.InvalidParameters;
    if (!fs.existsSync(`modules/${body.moduleName}/README.md`)) return '';
    const text = await fs.readFileSync(`modules/${body.moduleName}/README.md`, 'utf8');
    return text;
};

module.exports = {
    getModules,
    getModule,
    setModuleConfigById,
    initModule,
    checkDependenciesAtInstallation,
    checkDependenciesAtUninstallation,
    activateModule,
    deactivateModule,
    removeModule,
    setFrontModules,
    setFrontModuleInTheme,
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