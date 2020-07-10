const path             = require('path');
const mongoose         = require('mongoose');
const rimraf           = require('rimraf');
const packageManager   = require('../utils/packageManager');
const QueryBuilder     = require('../utils/QueryBuilder');
const npm              = require('../utils/npm');
const modulesUtils     = require('../utils/modules');
const serverUtils      = require('../utils/server');
const fs               = require('../utils/fsp');
const NSErrors         = require("../utils/errors/NSErrors");
const {Modules}        = require('../orm/models');
const themesService    = require('./themes');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Modules, restrictedFields, defaultFields);

/**
 * @description retourne les modules en fonction du PostBody
 */
const getModules = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

/**
 * @description retourne le module en fonction du PostBody
 */
const getModule = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

/**
 * @description Permet de modifier la configuration (champ conf) d'un module
 * @return Retourne la configuration du module la review venant d'étre modifié
 * @param body : body de la requête, il permettra de mettre à jour la configuration du module
 * @param _id : string : ObjectId de la configuration du module a modifié
 */
const setModuleConfigById = async (_id, config) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
    // Si un changement est effectué sur un document actif alors on désactive les autres
    const result = await Modules.findByIdAndUpdate(_id, {config}, {new: true, runValidators: true});
    if (!result) throw NSErrors.AgendaUpdateError;
    return result;
};

/**
 * @description Permet récupérer la configuration (champ conf) d'un module
 * @return Retourne la configuration du module
 * @param name (string) nom/code du module
 * @deprecated
 */
const getConfig = async (name) => {
    const _module = await Modules.findOne({name});
    return _module ? _module.config : undefined;
};

/**
 * @description Permet définir la configuration (champ conf) d'un module
 * @return {Promise<*>} Retourne la nouvelle configuration du module
 * @param name {string} nom/code du module
 * @param newConfig {object} la nouvelle configuration
 * @deprecated
 */
const setConfig = async (name, newConfig) => {
    return Modules.updateOne({name}, {$set: {config: newConfig}}, {new: true});
};

/**
 * @description Permet modifier une partie de la configuration (champ conf) d'un module
 * @param name {string} nom/code du module
 * @param field {string} le champ à modifier
 * @param value {*} la valeur définir dans le champ
 * @returns {Promise<*>} Retourne la nouvelle configuration du module
 */
const setPartialConfig = async (name, field, value) => {
    require("../utils/utils").tmp_use_route("modules_service", "setPartialConfig");
    const upd = {};
    upd[`config.${field}`] = value;
    return Modules.updateOne({name}, {$set: upd}, {new: true});
};

/**
 * Module : dezip module et copie dans /modules, insert en BDD
 * @param {string} originalname
 * @param {string} filepath
 */
const initModule = async (originalname, filepath) => {
    if (path.extname(originalname) === '.zip') {
        console.log("Upload module...");
        const target_path      = `modules/`;
        const target_path_full = path.join(target_path, originalname);

        // move the file from the temporary location to the intended location
        if (!await fs.access(target_path)) {
            await fs.mkdir(target_path);
        }
        await fs.copyFile(filepath, target_path_full);
        await fs.unlink(filepath);

        // Unzip
        console.log("Unziping module...");
        const AdmZip = require('adm-zip');
        try {
            const zip = new AdmZip(target_path_full);
            let found = false;
            zip.getEntries().forEach((zipEntry) => {
                if (
                    zipEntry.entryName === originalname.replace(".zip", "/")
                    || zipEntry.entryName.startsWith(originalname.replace(".zip", "/"))
                ) {
                    found = true;
                }
            });
            if (!found) {
                throw new Error("missing main folder in zip");
            }
            zip.extractAllTo(target_path, /* overwrite */true);
            console.log("Unzip module ok, reading info.json...");
            const data = await fs.readFile(`${target_path_full.replace(".zip", "/")}info.json`);
            console.log("Installing module...");
            const info   = data.toString();
            const jInfo  = JSON.parse(info);
            const myModule = await Modules.findOne({name: jInfo.info.name});

            const newModule = await Modules.findOneAndUpdate({name: jInfo.info.name}, {
                name                     : jInfo.info.name,
                description              : jInfo.info.description,
                version                  : jInfo.info.version,
                path                     : target_path_full.replace(".zip", "/"),
                url                      : jInfo.info.url,
                cronNames                : jInfo.info.cronNames,
                mailTypeCode             : jInfo.info.mailTypeCode,
                loadApp                  : jInfo.info.loadApp,
                loadTranslationBack      : jInfo.info.loadTranslationBack,
                loadTranslationFront     : jInfo.info.loadTranslationFront,
                packageDependencies      : jInfo.info.packageDependencies,
                moduleDependencies       : jInfo.info.moduleDependencies,
                component_template_front : jInfo.info.component_template_front || null,
                files                    : jInfo.info.files || [],
                active                   : !!(myModule && myModule.active)
            }, {upsert: true, new: true});

            // On teste si les fonctions init, initAfter, uninit et rgpd sont présentes
            const pathUninit = path.join(global.appRoot, '..', target_path_full.replace(".zip", "/"), 'uninit.js');
            try {
                await fs.access(pathUninit, fs.constants.F_OK);
            } catch (err) {
                console.error(`Uninit file is missing for : ${jInfo.info.name}`);
            }

            const pathInit = path.join(global.appRoot, '..', target_path_full.replace(".zip", "/"), 'init.js');
            try {
                await fs.access(pathInit, fs.constants.F_OK);
            } catch (err) {
                console.error(`Init file is missing for : ${jInfo.info.name}`);
            }

            const pathInitAfter = path.join(global.appRoot, '..', target_path_full.replace(".zip", "/"), 'initAfter.js');
            try {
                await fs.access(pathInitAfter, fs.constants.F_OK);
            } catch (err) {
                console.error(`InitAfter file is missing for : ${jInfo.info.name}`);
            }

            const pathRgpd = path.join(global.appRoot, '..', target_path_full.replace(".zip", "/"), 'rgpd.js');
            try {
                await fs.access(pathRgpd, fs.constants.F_OK);
            } catch (err) {
                console.error(`RGPD file is missing for : ${jInfo.info.name}`);
            }

            console.log("Module installed");
            return newModule;
        } catch (err) {
            modulesUtils.errorModule(target_path_full);
            throw err;
        }
    }
    throw NSErrors.InvalidFile;
};

const checkDependenciesAtInstallation = async (idModule) => {
    const myModule = await Modules.findById(idModule);
    let toBeChanged = {
        api   : {},
        theme : {}
    };
    const alreadyInstalled = {
        api   : {},
        theme : {}
    };
    let needUpgrade = false;
    if (myModule.packageDependencies && (myModule.packageDependencies.api || myModule.packageDependencies.theme)) {
        const modulesActivated = await Modules.find({_id: {$ne: idModule}, active: true}, "packageDependencies");
        if (myModule.packageDependencies.api) {
            myModule.packageDependencies.api = await modulesUtils.cleanPackageVersion([...myModule.packageDependencies.api]);
        }
        if (myModule.packageDependencies.theme) {
            myModule.packageDependencies.theme = await modulesUtils.cleanPackageVersion([...myModule.packageDependencies.theme]);
        }
        for (const elem of modulesActivated) {
            if (elem.packageDependencies.api) {
                elem.packageDependencies.api = await modulesUtils.cleanPackageVersion([...elem.packageDependencies.api]);
            }
            if (elem.packageDependencies.api) {
                elem.packageDependencies.theme = await modulesUtils.cleanPackageVersion([...elem.packageDependencies.theme]);
            }
        }
        toBeChanged = modulesUtils.compareDependencies(myModule, modulesActivated, true);

        /**
         * We use npm because yarn currently can't return only installed package
         * from package.json but from all dependencies of all packages
         * @see https://github.com/yarnpkg/yarn/issues/3569
         */
        if (myModule.packageDependencies.api) {
            const installedDependencies = await npm.npmCommand('list', ['--json']);
            for (const [index, value] of Object.entries(installedDependencies.result._dependencies)) {
                for (const [index2] of Object.entries(toBeChanged.api)) {
                    if (index === index2) {
                        alreadyInstalled.api[index] = `${index}@${value}`;
                        toBeChanged.api[index].add(`${index}@${value}`);
                    }
                }
            }
            const aquilaDependencies = JSON.parse(await fs.readFile(path.join(global.appRoot, "package-aquila.json")));
            for (const value of aquilaDependencies.dependencies) {
                const dependencyValue = value.split("@");
                if (dependencyValue[0] === "") {
                    dependencyValue.splice(0, 1);
                    dependencyValue[0] = `@${dependencyValue[0]}`;
                }
                for (const [index] of Object.entries(toBeChanged.api)) {
                    if (dependencyValue[0] === index) {
                        toBeChanged.api[index].add(value);
                    }
                }
            }
        }

        if (myModule.packageDependencies.theme) {
            const installedDependenciesTheme = JSON.parse((await npm.npmCommand('list', ['--json'], true)).stdout);
            for (const [index, value] of Object.entries(installedDependenciesTheme.dependencies)) {
                for (const [index2] of Object.entries(toBeChanged.theme)) {
                    if (index === index2) {
                        alreadyInstalled.theme[index] = `${index}@${value.version}`;
                        toBeChanged.theme[index].add(`${index}@${value.version}`);
                    }
                }
            }
            const themeDependencies = JSON.parse(await fs.readFile(path.join(global.appRoot, "themes", global.envConfig.environment.currentTheme, "package-theme.json")));
            for (const value of themeDependencies.dependencies) {
                const dependencyValue = value.split("@");
                if (dependencyValue[0] === "") {
                    dependencyValue.splice(0, 1);
                    dependencyValue[0] = `@${dependencyValue[0]}`;
                }
                for (const [index] of Object.entries(toBeChanged.theme)) {
                    if (dependencyValue[0] === index) {
                        toBeChanged.theme[index].add(value);
                    }
                }
            }
        }

        for (const apiOrTheme of Object.keys(toBeChanged)) {
            for (const value of Object.keys(toBeChanged[apiOrTheme])) {
                toBeChanged[apiOrTheme][value] = [...toBeChanged[apiOrTheme][value]];
                if ((alreadyInstalled[apiOrTheme][value] === "" || toBeChanged[apiOrTheme][value].length > 1) && needUpgrade === false) {
                    needUpgrade = true;
                    break;
                }
            }
            if (needUpgrade) break;
        }
    }
    return {
        toBeChanged,
        alreadyInstalled,
        needUpgrade
    };
};

const checkDependenciesAtUninstallation = async (idModule) => {
    const myModule = await Modules.findById(idModule);
    const toBeRemoved = {
        api   : {},
        theme : {}
    };
    const toBeChanged = {
        api   : {},
        theme : {}
    };
    const alreadyInstalled = {
        api   : {},
        theme : {}
    };
    let needUpgrade = false;
    if (myModule.packageDependencies && (myModule.packageDependencies.api || myModule.packageDependencies.theme)) {
        if (myModule.packageDependencies.api) {
            myModule.packageDependencies.api = await modulesUtils.cleanPackageVersion([...myModule.packageDependencies.api]);
        }
        if (myModule.packageDependencies.theme) {
            myModule.packageDependencies.theme = await modulesUtils.cleanPackageVersion([...myModule.packageDependencies.theme]);
        }
        const modulesActivated = await Modules.find({_id: {$ne: idModule}, active: true}, "packageDependencies");
        for (const elem of modulesActivated) {
            if (elem.packageDependencies.api) {
                elem.packageDependencies.api = await modulesUtils.cleanPackageVersion([...elem.packageDependencies.api]);
            }
            if (elem.packageDependencies.theme) {
                elem.packageDependencies.theme = await modulesUtils.cleanPackageVersion([...elem.packageDependencies.theme]);
            }
        }
        let result;
        if (
            (myModule.packageDependencies.api && myModule.packageDependencies.api.length > 0)
            || (myModule.packageDependencies.theme && myModule.packageDependencies.theme.length > 0)
        ) {
            result = modulesUtils.compareDependencies(myModule, modulesActivated, false);
        }

        if (myModule.packageDependencies.api) {
            const aquilaDependencies = JSON.parse(await fs.readFile(path.join(global.appRoot, "package-aquila.json")));
            for (const value of aquilaDependencies.dependencies) {
                const dependencyValue = value.split("@");
                if (dependencyValue[0] === "") {
                    dependencyValue.splice(0, 1);
                    dependencyValue[0] = `@${dependencyValue[0]}`;
                }
                for (const [index, value2] of Object.entries(result)) {
                    if (index === dependencyValue[0]) {
                        toBeChanged.api[index] = [];
                        toBeChanged.api[index].push(...(new Set([...value2, value])));
                    }
                }
            }
        }
        if (myModule.packageDependencies.api) {
            const themeDependencies = JSON.parse(await fs.readFile(path.join(global.appRoot, "themes", global.envConfig.environment.currentTheme, "package-theme.json")));
            for (const value of themeDependencies.dependencies) {
                const dependencyValue = value.split("@");
                if (dependencyValue[0] === "") {
                    dependencyValue.splice(0, 1);
                    dependencyValue[0] = `@${dependencyValue[0]}`;
                }
                for (const [index, value2] of Object.entries(result)) {
                    if (index === dependencyValue[0]) {
                        toBeChanged.theme[index] = [];
                        toBeChanged.theme[index].push(...(new Set([...value2, value])));
                    }
                }
            }
        }
        for (const apiOrTheme of ['api', 'theme']) {
            for (const iterator of Object.entries(result)) {
                if (!toBeChanged[apiOrTheme][iterator[0]] && iterator[1].length > 1) {
                    toBeChanged[apiOrTheme][iterator[0]] = [];
                    toBeChanged[apiOrTheme][iterator[0]].push(...iterator[1]);
                }
                if (!toBeChanged[apiOrTheme][iterator[0]] && iterator[1].length === 1) {
                    toBeRemoved[apiOrTheme][iterator[0]] = [];
                    toBeRemoved[apiOrTheme][iterator[0]].push(...iterator[1]);
                }
            }
        }
        /**
         * We use npm because yarn currently can't return only installed package
         * from package.json but from all dependencies of all packages
         * @see https://github.com/yarnpkg/yarn/issues/3569
         */
        if (myModule.packageDependencies.api) {
            const installedDependencies = await npm.npmCommand('list', ['--json']);
            // const installedDependencies = JSON.parse((await packageManager.execSh("npm", ["ls", "--json"], "./")).stdout).dependencies;
            for (const [index, value] of Object.entries(installedDependencies)) {
                for (const [index2] of Object.entries(result)) {
                    if (index === index2) {
                        alreadyInstalled.api[index] = `${index}@${value.version}`;
                    }
                }
            }
        }
        if (myModule.packageDependencies.theme) {
            const installedDependenciesTheme = JSON.parse((await npm.npmCommand('list', ['--json'], true)).stdout);
            for (const [index, value] of Object.entries(installedDependenciesTheme.dependencies)) {
                for (const [index2] of Object.entries(result)) {
                    if (index === index2) {
                        alreadyInstalled.theme[index] = `${index}@${value.version}`;
                    }
                }
            }
        }
        for (const apiOrTheme of ['api', 'theme']) {
            for (const iterator of Object.keys(toBeChanged[apiOrTheme])) {
                if (alreadyInstalled[iterator] && toBeChanged[apiOrTheme][iterator].length === 2) {
                    const pos = toBeChanged[apiOrTheme][iterator].indexOf(alreadyInstalled[apiOrTheme][iterator]);
                    if (pos !== -1) {
                        toBeChanged[apiOrTheme][iterator].splice(pos, 1);
                    } else {
                        toBeChanged[apiOrTheme][iterator].push(alreadyInstalled[apiOrTheme][iterator]);
                    }
                }
            }
        }

        for (const apiOrTheme of Object.keys(toBeChanged)) {
            for (const value of Object.keys(toBeChanged[apiOrTheme])) {
                if (toBeChanged[apiOrTheme][value].length > 1 && needUpgrade === false) {
                    needUpgrade = true;
                    break;
                }
            }
            if (needUpgrade) break;
        }
    }
    return {
        toBeRemoved,
        toBeChanged,
        needUpgrade,
        alreadyInstalled
    };
};

/**
 * Module : copie (back & front) depuis /modules, mettre en actif le module,
 * npm install back (dans aquila), npm install du theme (avec les modules actifs)
 * @param {String} idModule mongoose id of the module
 */
const activateModule = async (idModule, toBeChanged) => {
    const myModule = await Modules.findOne({_id: idModule});
    await modulesUtils.checkModuleDepencendiesAtInstallation(myModule);

    const copy  = path.resolve(`backoffice/app/${myModule.name}`);
    const copyF = path.resolve(`modules/${myModule.name}/app/`);
    const copyTab = [];
    if (await fs.access(copyF, fs.constants.W_OK)) {
        try {
            await fs.copyRecursiveSync(copyF, copy, true);
        } catch (err) {
            console.error(err);
        }
        copyTab[0] = copy;
    }

    if (myModule.loadTranslationBack) {
        console.log("Loading back translation for module...");
        const copy  = path.resolve(global.appRoot, `backoffice/assets/translations/modules/${myModule.name}`);
        const copyF = path.resolve(global.appRoot, `modules/${myModule.name}/translations/back/`);
        if (await fs.access(copyF, fs.constants.W_OK)) {
            try {
                await fs.copyRecursiveSync(copyF, copy, true);
            } catch (err) {
                console.error(err);
            }
            copyTab[1] = copy;
        }
    }

    if (myModule.loadTranslationFront) {
        console.log("Loading front translation for module...");
        const {currentTheme} = global.envConfig.environment;
        const files = await fs.readdir(`themes/${currentTheme}/assets/i18n/`);
        files.splice(files.indexOf('index.js'), 1);
        for (let i = 0; i < files.length; i++) {
            const copy  = path.resolve(global.appRoot, `themes/${currentTheme}/assets/i18n/${files[i]}/modules/${myModule.name}`);
            const copyF = path.resolve(global.appRoot, `modules/${myModule.name}/translations/front/${files[i]}/`);
            if (await fs.access(copyF, fs.constants.W_OK)) {
                try {
                    await fs.copyRecursiveSync(copyF, copy, true);
                } catch (err) {
                    console.error(err);
                }
                copyTab[i + 2] = copy;
            }
        }
    }

    // Si le module contient des dépendances utilisable dans le front
    // alors on lance l'install pour installer les dépendances dans aquila
    if (myModule.packageDependencies) {
        if (myModule.packageDependencies.api) {
            const allModulesApi = await modulesUtils.cleanAndToBeChanged(myModule.packageDependencies.api, toBeChanged.api);
            if (allModulesApi.length > 0) {
                console.log("Installing dependencies of the module in aquila...");
                await packageManager.execCmd(`yarn add ${allModulesApi.join(' ')}`, `./`);
            }
        }
        if (myModule.packageDependencies.theme) {
            const allModulesTheme = await modulesUtils.cleanAndToBeChanged(myModule.packageDependencies.theme, toBeChanged.theme);
            if (allModulesTheme.length > 0) {
                console.log("Installing dependencies of the module in theme...");
                await packageManager.execCmd(`yarn add ${allModulesTheme.join(' ')}`, path.resolve(global.appRoot, 'themes', global.envConfig.environment.currentTheme));
            }
        }
    }

    // Si le module doit importer des composants dans le front
    await addOrRemoveThemeFiles(idModule, `modules/${myModule.name}/theme_components`, false);
    await myModule.updateOne({$push: {files: copyTab}, active: true});
    console.log("Module activated");
    return Modules.find({});
};

/**
 * Module : supprimer les fichiers (back & front), mettre en inactif le module, npm install back (dans aquila), npm install du theme (avec les modules actifs)
 */
const deactivateModule = async (idModule, toBeChanged, toBeRemoved) => {
    const myModule = await Modules.findOne({_id: idModule});
    await modulesUtils.checkModuleDepencendiesAtUninstallation(myModule);
    // Si le module doit importer des composants dans le front, alors on les supprimes dans le front
    try {
        await removeModuleAddon(myModule);
        await addOrRemoveThemeFiles(idModule, `${myModule.path}theme_components`, true);
    } catch (error) {
        console.error(error);
    }

    // Suppression des fichiers copiés
    for (let i = 0; i < myModule.files.length; i++) {
        if (await fs.access(myModule.files[i])) {
            if ((await fs.lstatSync(myModule.files[i])).isDirectory()) {
                require('rimraf')(myModule.files[i], (err) => {
                    if (err) console.error(err);
                });
            } else {
                try {
                    await fs.unlink(myModule.files[i]);
                } catch (err) {
                    console.error('Error: ', err);
                }
            }
        }
    }

    await Modules.updateOne({_id: idModule}, {files: [], active: false});

    console.log("Removing dependencies of the module...");
    // On supprime les dépendances du module
    for (const apiOrTheme of Object.keys(toBeRemoved)) {
        let allModulesToRemove = [];
        for (const packageName of Object.values(toBeRemoved[apiOrTheme])) {
            const elem = packageName.split("@");
            if (elem[0] === "") {
                elem.splice(0, 1);
                elem[0] = `@${elem[0]}`;
            }
            allModulesToRemove = [...allModulesToRemove, elem[0]];
        }
        if (allModulesToRemove.length > 0) {
            if (apiOrTheme === 'theme') {
                await packageManager.execCmd(
                    `yarn remove ${allModulesToRemove.join(' ')}`,
                    path.resolve(global.appRoot, 'themes', global.envConfig.environment.currentTheme)
                );
            } else if (apiOrTheme === 'api') {
                await packageManager.execCmd(`yarn remove ${allModulesToRemove.join(' ')}`, `./`);
            }
        }

        let allModulesAquila = [];
        for (const packageName of Object.values(toBeChanged[apiOrTheme])) {
            allModulesAquila = [...allModulesAquila, packageName];
        }
        if (allModulesAquila.length > 0) {
            if (apiOrTheme === 'theme') {
                await packageManager.execCmd(
                    `yarn add ${allModulesAquila.join(' ')}`,
                    path.resolve(global.appRoot, 'themes', global.envConfig.environment.currentTheme)
                );
            } else if (apiOrTheme === 'api') {
                await packageManager.execCmd(`yarn add ${allModulesAquila.join(' ')}`, `./`);
            }
        }
    }

    console.log("Module desactivated");
    return Modules.find({});
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
    console.log("Set module's front files...");
    // Création du fichier s'il n'existe pas, ou reinit du fichier
    await modulesUtils.createListModuleFile(theme || global.envConfig.environment.currentTheme);

    // Mettre à jour le contenu du fichier par rapport aux modules
    const listModules = await Modules.find({active: true/* , "et need front" */});

    for (let index = 0; index < listModules.length; index++) {
        const oneModule = listModules[index];

        // Est ce que ce module comprend du front ?
        if (await fs.access(`./${oneModule.path}`)) {
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

    if (pathModule.lastIndexOf("theme_components") === -1) {
        pathModule += "theme_components/";
    }
    if (!pathModule.endsWith("/")) {
        pathModule += "/";
    }

    // On regarde si le dossier theme_components existe dans le module, si c'est le cas, alors c'est un module front
    if (!await fs.access(pathModule)) return;
    const currentTheme = theme || global.envConfig.environment.currentTheme;// serviceTheme.getThemePath(); // Bug
    const resultDir    = await fs.readdir(pathModule);

    // Pour chaque fichier front du module
    for (let i = 0; i < resultDir.length; i++) {
        const file = resultDir[i];
        if (!file.startsWith("Module") || !file.endsWith(".js")) {
            continue;
        }
        const fileNameWithoutModule = file.replace("Module", "").replace('.js', '').toLowerCase(); // ModuleNomComposant.js ->nomcomposant
        const jsxModuleToImport     = `{ jsx: require('./${file}').default, code: 'aq-${fileNameWithoutModule}' },`;
        const pathListModules       = path.resolve(`themes/${currentTheme}/modules/list_modules.js`);
        const result                = await fs.readFile(pathListModules, 'utf8');

        // file don't contain module name
        if (result.indexOf(fileNameWithoutModule) <= 0) {
            const exportDefaultListModule = result.match(new RegExp(/\[(.*?)\]/, 'g'))[0];
            const replaceListModules = `export default ${exportDefaultListModule.slice(0, exportDefaultListModule.lastIndexOf(']'))} ${jsxModuleToImport}]`;
            await fs.writeFile(pathListModules, replaceListModules, {flags: 'w'});
        }

        // Copier les fichiers (du module) necessaire aux front
        const copyTo = `./themes/${currentTheme}/modules/${file}`;
        const copyTab = [`themes/${currentTheme}/modules/${file}`];
        // ON enregistre les fichiers theme components pour chaque theme pour pouvoir les supprimer
        await Modules.updateOne({path: savePath}, {$push: {files: copyTab}});
        fs.copyFileSync(pathModule + file, copyTo);
        console.log(`Copy module's files front : ${pathModule + file} -> ${copyTo}`);
    }
};

/**
 * Fonction permettant de gérer l'ajout ou la suppression d'un module front
 * @param idModule
 * @param {*} pathModule chemin vers le composant front du module ex: "modules/mon-module-aquila/theme_components"
 * @param {*} toRemove si true alors on supprime les fichiers de "themes/currentTheme/modules" ainsi que de "themes/currentTheme/list_modules"
 */
const addOrRemoveThemeFiles = async (idModule, pathModule, toRemove) => {
    // On regarde si le dossier theme_components existe dans le module, si c'est le cas, alors c'est un module front
    if (!(await fs.access(pathModule))) return;
    const currentTheme = global.envConfig.environment.currentTheme;
    const resultDir    = await fs.readdir(pathModule);
    for (let i = 0; i < resultDir.length; i++) {
        const file = resultDir[i];
        if (!file.startsWith("Module") || !file.endsWith(".js")) continue;
        let resultRemoveOrAdd = null;
        if (toRemove) {
            const fileNameWithoutModule = file.replace("Module", "")
                .replace('.js', '')
                .toLowerCase();
            await removeFromListModule(file, currentTheme, fileNameWithoutModule);
            resultRemoveOrAdd = await fs.unlink(`themes/${currentTheme}/modules/${file}`);
            if (typeof resultRemoveOrAdd !== "undefined") {
                console.log(`cannot rm themes/${currentTheme}/modules/${file}`);
                continue;
            }
            console.log(`rm themes/${currentTheme}/modules/${file}`);
        } else {
            await setFrontModuleInTheme(pathModule, currentTheme);
        }
    }
    // Rebuild du theme
    if (serverUtils.getEnv("NODE_ENV") === "production") {
        await themesService.buildTheme(currentTheme);
        packageManager.restart();
    }
};

/**
 * Permet d'ajouter dans le fichier montheme/modules/list_modules.js le ou les import(s) permettant d'utiliser le front du module sur le theme
 * @param {*} pathModule : chemin du module coté back
 * @param {*} bRemove : si true alors on supprime le ou les import(s) du fichier montheme/modules/list_modules.js, si false alors on ajout le ou les import(s)
 */
const activeFrontModule = async (pathModule, bRemove) => {
    require("../utils/utils").tmp_use_route("modules_service", "activeFrontModule");

    // On regarde si le dossier theme_components existe dans le module, si c'est le cas, alors c'est un module front
    if (!await fs.access(pathModule)) return;
    await modulesUtils.createListModuleFile(global.envConfig.environment.currentTheme);
    await setFrontModuleInTheme(pathModule, bRemove);
    await themesService.buildTheme(global.envConfig.environment.currentTheme);
};

/**
 * Fonction permettant de supprimer un import dans themes/${currentTheme}/modules/list_modules.js
 * @param {*} jsxModuleToImport { jsx: require('./ModuleMonModule.js').default, code: 'aq-monmodule' },
 * @param {*} exportDefaultListModule [{ jsx: require('./ModuleMonModule1.js').default, code: 'aq-monmodule1' }, ...]
 * @param {*} pathListModules themes/${currentTheme}/modules/list_modules.js`
 */
const removeImport = async (jsxModuleToImport, exportDefaultListModule, pathListModules) => {
    // On supprime les espaces
    const objectToRemove    = jsxModuleToImport.replace(/\s+/g, '');
    // On supprime les espaces des infos contenus dans le tableau de l'export
    exportDefaultListModule = exportDefaultListModule.replace(/\s+/g, '');
    // On replace par "" l'objet a supprimer de fichier
    const result            = exportDefaultListModule.replace(objectToRemove, "");
    await fs.writeFile(pathListModules, `export default ${result}`, {flag: 'w'});
};

const removeFromListModule = async (file, currentTheme, fileNameWithoutModule) => {
    try {
        const pathListModules = path.resolve(`themes/${currentTheme}/modules/list_modules.js`);
        await fs.stat(pathListModules); // On verifie si pathListModules existe
        const result                  = await fs.readFile(pathListModules, 'utf8');
        const jsxModuleToImport       = `{ jsx: require('./${file}').default, code: 'aq-${fileNameWithoutModule}' },`;
        const exportDefaultListModule = result.match(new RegExp(/\[(.*?)\]/, 'g'))[0];
        await removeImport(jsxModuleToImport, exportDefaultListModule, pathListModules);
    } catch (error) {
        console.error(error);
    }
};

const removeModuleAddon = async (myModule) => {
    if (!myModule) return;
    try {
        const uninit = require(path.join(global.appRoot, '..', myModule.path, 'uninit'));
        await new Promise((resolve, reject) => {
            uninit(resolve, reject);
        });
    } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
    // Si c'est un module contenant un job alors on supprime le job dans la collection agendaJobs
    if (myModule.cronNames && myModule.cronNames.length > 0) {
        try {
            myModule.cronNames.forEach(async (cronName) => {
                await require("./job").deleteModuleJobByName(cronName);
            });
        } catch (error) {
            console.error(error);
        }
    }
    if (myModule.mailTypeCode && myModule.mailTypeCode.length > 0) {
        try {
            myModule.mailTypeCode.forEach(async (mailCode) => {
                await require("./mailType").deleteMailType(mailCode);
            });
        } catch (error) {
            console.error(error);
        }
    }
};

const initComponentTemplate = async (model, component, moduleName) => {
    const elements = await mongoose.model(model).find({});
    for (const elem of elements) {
        if (!elem.component_template || !elem.component_template.includes(component)) {
            let newComponentTemplate = elem.component_template || "";
            newComponentTemplate += component;
            await mongoose.model(model).updateOne({_id: elem._id}, {$set: {component_template: newComponentTemplate}});
        }
    }
    console.log(`${moduleName}: Ajout du champ component_template = ${component} nombre de champs ajouté: ${elements.length}`);
};

const uninitComponentTemplate = async (model, component, moduleName, field) => {
    const elements = await mongoose.model(model).find({});
    for (const elem of elements) {
        let newComponentTemplate = elem.component_template || "";
        newComponentTemplate = newComponentTemplate.replace(component, '');
        await mongoose.model(model).updateOne({_id: elem._id}, {$unset: {[field]: ""}, $set: {component_template: newComponentTemplate}});
    }
    console.log(`${moduleName}: Suppression du champ component_template = ${component} nombre de champs supprimé: ${elements.length}`);
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
                if (files.endsWith(".js")) {
                    item.files.push(files);
                }
            }
            tabM.push(item);
        } catch (err) {
            console.error(`Could not load module ${module.name}`);
            console.error(err);

            await require("./admin").insertAdminInformation({
                code        : `module_${module.name}_missing`,
                type        : "danger",
                translation : {
                    en : {
                        title : "Module missing",
                        text  : `The module <b>${module.name}</b> is installed, but his files are missing`
                    },
                    fr : {
                        title : "Module manquant",
                        text  : `Le module <b>${module.name}</b> est installé, mais ces fichiers sont manquant`
                    }
                }
            });
        }
    }

    return tabM;
};

module.exports = {
    getModules,
    getModule,
    setModuleConfigById,
    getConfig,
    setConfig,
    setPartialConfig,
    initModule,
    checkDependenciesAtInstallation,
    checkDependenciesAtUninstallation,
    activateModule,
    deactivateModule,
    removeModule,
    setFrontModules,
    setFrontModuleInTheme,
    addOrRemoveThemeFiles,
    activeFrontModule,
    removeImport,
    removeFromListModule,
    removeModuleAddon,
    initComponentTemplate,
    uninitComponentTemplate,
    loadAdminModules
};