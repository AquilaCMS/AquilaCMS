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
const {dynamicWorkspacesMgmt}     = require('../utils/utils');
const utilsThemes                 = require('../utils/themes');
const QueryBuilder                = require('../utils/QueryBuilder');
const modulesUtils                = require('../utils/modules');
const {getEnv}                    = require('../utils/server');
const NSErrors                    = require('../utils/errors/NSErrors');
const logger                      = require('../utils/logger');
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
    const zipFilePath        = path.resolve(global.aquila.modulesPath, originalname); // /path/to/AquilaCMS/apps/modules/my-module.zip
    const extractZipFilePath = zipFilePath.replace('.zip', '/');                // /path/to/AquilaCMS/apps/modules/my-module/

    // move the file from the temporary location to the intended location
    await fs.copyFile(filepath, zipFilePath);
    await fs.unlink(filepath);

    try {
        const zip         = new AdmZip(zipFilePath);
        const packageJson = zip.getEntry(`${originalname.replace('.zip', '/')}package.json`);
        const infojson    = zip.getEntry(`${originalname.replace('.zip', '/')}info.json`);
        if (!packageJson) {
            throw NSErrors.ModuleInfoNotFound; // package.json not found in zip
        } else if (originalname.replace('.zip', '') !== JSON.parse(packageJson.getData().toString()).name) {
            throw NSErrors.ModuleNameMissmatch;
        }
        const moduleAquilaVersion = JSON.parse(infojson.getData().toString()).info.aquilaVersion;
        if (moduleAquilaVersion) {
            const packageAquilaApi = (await fs.readFile(path.join(global.aquila.appRoot, 'package.json'), 'utf8')).toString();
            const apiVersion       = JSON.parse(packageAquilaApi).version;
            if (!semver.satisfies(apiVersion.replace(/\.0+/g, '.'), moduleAquilaVersion.replace(/\.0+/g, '.'))) {
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
                break;
            }
        }
        if (!found) {
            throw NSErrors.ModuleMainFolder; // missing main folder in zip
        }
        console.log('Unziping module...');
        await new Promise((resolve, reject) => {
            zip.extractAllToAsync(global.aquila.modulesPath, true, (err) => {
                if (err) {
                    logger.error(err.message);
                    reject();
                }
                resolve();
            });
        });
        console.log('Unzip module ok, reading info.json...');

        const infoPath = path.join(extractZipFilePath, 'info.json');
        if (!fs.existsSync(infoPath)) throw NSErrors.ModuleInfoNotFound;
        const infoFile = await fs.readFile(infoPath, 'utf8'); // TODO : to be removed when no more info.json is used

        const packageFilePath = path.join(extractZipFilePath, 'package.json');
        if (!fs.existsSync(packageFilePath)) throw NSErrors.ModulePackageJsonNotFound;
        const packageFile = await fs.readFile(packageFilePath, 'utf8');

        const packageJSON = JSON.parse(packageFile);
        const {info}      = JSON.parse(infoFile);
        console.log('Installing module...');

        const myModule  = await Modules.findOne({name: packageJSON.name});
        const newModule = await Modules.findOneAndUpdate({name: packageJSON.name}, {
            name                     : packageJSON.name,
            description              : packageJSON.description,
            version                  : packageJSON.version,
            path                     : slash(path.join(global.aquila.modulesPath, originalname).replace('.zip', '/')),
            url                      : info.url,
            cronNames                : info.cronNames,
            mailTypeCode             : info.mailTypeCode,
            loadApp                  : info.loadApp,
            loadTranslationBack      : info.loadTranslationBack,
            loadTranslationFront     : info.loadTranslationFront,
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
            logger.error(`Uninit file is missing for : ${packageJSON.name}`);
        }

        const pathInit = path.join(extractZipFilePath, 'init.js');
        if (!fs.existsSync(pathInit)) {
            logger.error(`Init file is missing for : ${packageJSON.name}`);
        }

        const pathInitAfter = path.join(extractZipFilePath, 'initAfter.js');
        if (!fs.existsSync(pathInitAfter)) {
            logger.error(`InitAfter file is missing for : ${packageJSON.name}`);
        }

        const pathRgpd = path.join(extractZipFilePath, 'rgpd.js');
        if (!fs.existsSync(pathRgpd)) {
            logger.error(`RGPD file is missing for : ${packageJSON.name}`);
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
            logger.error(err.message);
        }
        try {
            console.log('removing file in module folder...');
            await fs.deleteRecursive(extractZipFilePath);
        } catch (err) {
            logger.error(err.message);
        }
        throw err;
    }
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

        const moduleFolderAbsPath = path.join(global.aquila.modulesPath, myModule.name);

        // Add module name to the module package json workspaces field
        await dynamicWorkspacesMgmt(myModule.name, 'modules', true);

        const copy  = path.join(global.aquila.boPath, 'app', myModule.name);
        const copyF = path.join(moduleFolderAbsPath, 'app');
        let copyTab = [];
        if (await fs.hasAccess(copyF)) {
            try {
                await fs.copyRecursive(copyF, copy, true);
            } catch (err) {
                logger.error(err.message);
            }
            copyTab.push(copy);
        }

        if (myModule.loadTranslationBack) {
            console.log('Loading back translation for module...');
            const src  = path.join(global.aquila.modulesPath, myModule.name, 'translations/back');
            const dest = path.join(global.aquila.boPath, 'assets/translations/modules', myModule.name);
            if (await fs.hasAccess(src)) {
                try {
                    await fs.copyRecursive(src, dest, true);
                } catch (err) {
                    logger.error(err.message);
                }
                copyTab.push(dest);
            }
        }

        await execCmd('yarn install', global.aquila.aqlPath);

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

const installDependencies = async () => {
    console.log('Modules packageDependencies install start');
    await execCmd('yarn install', global.aquila.aqlPath);
    console.log('Modules packageDependencies installed');
    return true;
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
    const pathToThemeComponents = path.join(global.aquila.modulesPath, myModule.name, pathToComponents);

    // Control compatibility between the module and the theme
    if (!fs.existsSync(pathToThemeComponents)) {
        throw NSErrors.IncompatibleModuleComponentType;
    }

    if (myModule.loadTranslationFront) {
        console.log('Front translation for module : Loading ...');
        try {
            const pathToTranslateFile = path.join(global.aquila.themesPath, currentTheme, 'assets', 'i18n');
            const hasAccess           = await fs.hasAccess(pathToTranslateFile);
            if (hasAccess) {
                const files      = await fs.readdir(pathToTranslateFile);
                const fileLength = files.length;
                for (let i = 0; i < fileLength; i++) {
                    const lang = files[i];
                    if (lang === 'index.js') {
                        continue;
                    }
                    const src  = path.resolve(global.aquila.modulesPath, myModule.name, 'translations', 'front', lang);
                    const dest = path.resolve(global.aquila.themesPath, currentTheme, 'assets', 'i18n', lang, 'modules', myModule.name);
                    if (await fs.hasAccess(src)) {
                        try {
                            await fs.copyRecursive(src, dest, true);
                        } catch (err) {
                            logger.error(err.message);
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

/**
 * Deactivate a module by id and delete file moved
 * to the backoffice and the theme if exists
 * @param {String} idModule
 */
const deactivateModule = async (idModule) => {
    try {
        const _module = (await Modules.findById(idModule)).toObject();
        if (!_module) {
            throw NSErrors.ModuleNotFound;
        }
        await modulesUtils.checkModuleDepencendiesAtUninstallation(_module);

        // Add module name to the module package json workspaces field
        dynamicWorkspacesMgmt(_module.name, 'modules', false);

        await removeModuleAddon(_module);

        // Deleting copied files
        for (let i = 0; i < _module.files.length; i++) {
            if (await fs.hasAccess(_module.files[i])) {
                if ((await fs.lstat(_module.files[i])).isDirectory()) {
                    await new Promise((resolve) => {
                        rimraf(_module.files[i], (err) => {
                            if (err) logger.error(err.message);
                            resolve();
                        });
                    });
                } else {
                    try {
                        await fs.unlink(_module.files[i]);
                    } catch (err) {
                        logger.error(`Error: ${err.message}`);
                    }
                }
            }
        }

        await frontUninstallationActions(_module);

        // We have to update dependencies to remove dependencies from this module
        await execCmd('yarn install', global.aquila.aqlPath);

        await Modules.updateOne({_id: idModule}, {$set: {files: [], active: false}});
        console.log('Module deactivated');
        return Modules.find({}).sort({active: -1, name: 1});
    } catch (err) {
        if (!err.datas) err.datas = {};
        err.datas.modules = await Modules.find({}).sort({active: -1, name: 1});
        throw err;
    }
};

const frontUninstallationActions = async (_module) => {
    const {currentTheme}       = global.aquila.envConfig.environment;
    const themeModuleComponent = await retrieveModuleComponentType(currentTheme);
    if (themeModuleComponent === 'no-installation') {
        console.log(`No components were required by this theme (${currentTheme})`);
    } else {
        let pathToComponents = 'theme_components';
        if (themeModuleComponent) pathToComponents = path.join(pathToComponents, themeModuleComponent);
        const pathToThemeComponents = path.join(global.aquila.modulesPath, _module.name, pathToComponents);
        await addOrRemoveThemeFiles(
            pathToThemeComponents,
            true
        );
        console.log('Removing dependencies of the module...');
        if (_module.packageDependencies) {
            // At this point the module folder has a ".disabled" at the end so a yarn install will remove the associate dependencies
            await execCmd('yarn install', global.aquila.aqlPath);
        }
    }
};

/**
 * Delete module (if active, don't remove it): delete files in /modules, remove in DB
 * @param {string} id id of the module
 */
const removeModule = async (idModule) => {
    const module = await Modules.findOne({_id: idModule});

    const path = path.join(global.aquila.modulesPath, module.name);
    console.log('Removing module in database');
    await Modules.deleteOne({_id: idModule});

    console.log('Removing modules files');
    try {
        await fs.unlink(path.replace(/\/$/, '.zip'));
    } catch (err) {
        logger.error(err.message);
    }
    rimraf(path, (err) => {
        if (err) logger.error(`Error: ${err.message}`);
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
        const modulePath = path.join(global.aquila.modulesPath, oneModule.name);
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
    const pathToThemeModules = path.join(global.aquila.themesPath, currentTheme, 'modules');

    const packageJson   = await fs.readFile(path.join(savePath, 'package.json'));
    const parsedpkgJson = JSON.parse(packageJson);

    const info       = await fs.readFile(path.join(savePath, 'info.json'));
    const parsedInfo = JSON.parse(info);

    const moduleFolderInTheme = path.join(pathToThemeModules, parsedpkgJson.name);
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
        const jsxModuleToImport     = `{jsx: ${moduleComponentType !== '' ? 'import' : 'require'}('./${parsedpkgJson.name}/${file}'), module: '${parsedpkgJson.name}', code: 'aq-${fileNameWithoutModule}', type: '${type}'},`;
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
        fs.copyFileSync(path.resolve(pathModule, file), copyTo);
        console.log(`Copy module's files front : ${path.resolve(pathModule, file)} -> ${copyTo}`);
        // Delete file in resultDir
        const index = resultDir.findIndex((f) => f.name === file);
        if (index !== -1) {
            resultDir.splice(index, 1);
        }
    }

    // Add the rest of the folders and files
    if (moduleComponentType && moduleComponentType !== 'no-installation') {
        for (let i = 0; i < resultDir.length; i++) {
            const thisDir = path.join(moduleFolderInTheme, resultDir[i].name);
            await fs.copyRecursive(pathModule + resultDir[i].name, thisDir, true);
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
            let filePath = path.join(global.aquila.themesPath, currentTheme, 'modules', fileName);
            if (!fs.existsSync(filePath)) filePath = path.join(global.aquila.themesPath, currentTheme, 'modules', moduleName, fileName); // The new way
            if (fs.existsSync(filePath)) {
                try {
                    await fs.unlink(filePath);
                    console.log(`Delete ${filePath}`);
                } catch (err) {
                    console.log(`Cannot delete ${filePath}`);
                }
            }
        }

        let moduleFolderInTheme = path.join(global.aquila.themesPath, currentTheme, 'modules', moduleName);
        if (fs.existsSync(moduleFolderInTheme)) {
            fs.rmSync(moduleFolderInTheme, {recursive: true, force: true});
            console.log(`Delete ${moduleFolderInTheme}`);
        } else {
            moduleFolderInTheme = path.join(global.aquila.themesPath, currentTheme, 'modules', `${moduleName}.disabled`);
            if (fs.existsSync(moduleFolderInTheme)) {
                fs.rmSync(moduleFolderInTheme, {recursive: true, force: true});
                console.log(`Delete ${moduleFolderInTheme}`);
            }
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
        const pathListModules = path.join(global.aquila.themesPath, currentTheme, 'modules/list_modules.js');
        if (fs.existsSync(pathListModules)) {
            const result            = await fs.readFile(pathListModules, 'utf8');
            const thisModuleElement = new RegExp(`{[^{]*${file}[^}]*},`, 'gm');
            await removeImport(thisModuleElement, result, pathListModules);
        }
    } catch (error) {
        logger.error(error.message);
    }
};

/**
 * call uninit in _module, remove cronNames and mailTypeCode
 * @param {Modules} _module
 */
const removeModuleAddon = async (_module) => {
    if (!_module) return;
    const uninit = path.join(global.aquila.modulesPath, _module.name, 'uninit.js');
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
                logger.error(`Unable to delete the job '${cronName}'`);
            }
        }
    }
    if (_module.mailTypeCode && _module.mailTypeCode.length > 0) {
        for (const mailCode of _module.mailTypeCode) {
            try {
                await require('./mailType').deleteMailType(mailCode, false);
            } catch (err) {
                logger.error(err.message);
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
            const pathToModule = path.join(global.aquila.boPath, 'app', oneModule.name);
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
            logger.error(`Could not load module ${oneModule.name}`);
            logger.error(err.message);

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
    const pathToMd = path.join(global.aquila.modulesPath, body.moduleName, body.filename || 'README.md');
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