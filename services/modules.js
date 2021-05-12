/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const AdmZip           = require('adm-zip');
const path             = require('path');
const mongoose         = require('mongoose');
const rimraf           = require('rimraf');
const semver           = require('semver');
const packageManager   = require('../utils/packageManager');
const QueryBuilder     = require('../utils/QueryBuilder');
const modulesUtils     = require('../utils/modules');
const {isProd, getEnv} = require('../utils/server');
const fs               = require('../utils/fsp');
const NSErrors         = require('../utils/errors/NSErrors');
const {Modules}        = require('../orm/models');
const themesService    = require('./themes');
const {PackageJSON}    = require('../utils');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Modules, restrictedFields, defaultFields);

/**
 * Get modules
 */
const getModules = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

/**
 * Get one module
 */
const getModule = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

/**
 * Set the configuration (conf field) of a module
 * @param body : body of the request, it will update the module configuration
 * @param _id : string : ObjectId of the module configuration has changed
 * @returns return configuration's module
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
            moduleDependencies       : info.moduleDependencies,
            component_template_front : info.component_template_front || null,
            files                    : info.files || [],
            type                     : info.type,
            versionAquila            : info.versionAquila,
            active                   : !!(myModule && myModule.active)
        }, {upsert: true, new: true});

        // Check if the functions init, initAfter, uninit and rgpd are present
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
            await fs.deleteRecursive(extractZipFilePath);
        } catch (err) {
            console.error(err);
        }
        throw err;
    }
};

/**
 * Module : copy (back & front) from / modules, activate the module,
 * npm install back (in aquila), npm install for the theme (with active modules)
 * @param {String} idModule mongoose id of the module
 */
const activateModule = async (idModule) => {
    try {
        const myModule = await Modules.findOne({_id: idModule});
        await modulesUtils.checkModuleDepencendiesAtInstallation(myModule);

        const copy    = path.resolve(`backoffice/app/${myModule.name}`);
        const copyF   = path.resolve(`modules/${myModule.name}/app/`);
        const copyTab = [];
        if (await fs.hasAccess(copyF)) {
            try {
                await fs.copyRecursive(
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
                    await fs.copyRecursive(
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
                        await fs.copyRecursive(src, dest, true);
                    } catch (err) {
                        console.error(err);
                    }
                    copyTab.push(dest);
                }
            }
        }

        const packageJSON = new PackageJSON();
        await packageJSON.read();
        packageJSON.workspaces.push(`modules/${myModule.name}`);
        await packageJSON.save();

        await packageManager.execCmd(`yarn install${isProd ? ' --prod' : ''}`);

        // If the module must import components into the front
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
 */
const deactivateModule = async (idModule) => {
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

        // Deleting copied files
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
        const packageJSON = new PackageJSON();
        await packageJSON.read();
        const workspaceIndex = packageJSON.workspaces.indexOf(`/modules/${_module.name}`);
        packageJSON.workspaces.splice(workspaceIndex, 1);
        await packageJSON.save();
        await packageManager.execCmd(`yarn install${isProd ? ' --prod' : ''}`);

        await Modules.updateOne({_id: idModule}, {$set: {files: [], active: false}});
        console.log('Module deactivated');
        return Modules.find({}).sort({active: -1, name: 1});
    } catch (err) {
        if (!err.datas) err.datas = {};
        err.datas.modules = await Modules.find({}).sort({active: -1, name: 1});
        throw err;
    }
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

/**
 * Module : Before loading front's module, need to create '\themes\ {theme_name}\modules\list_modules.js'and populate it
 */
const setFrontModules = async (theme) => {
    console.log('Set module\'s front files...');
    // Create the file if it does not exist, or reinit of the file
    await modulesUtils.createListModuleFile(theme || global.envConfig.environment.currentTheme);

    // Update file content (from modules)
    const listModules = await Modules.find({active: true/* , "et need front" */});

    for (let index = 0; index < listModules.length; index++) {
        const oneModule = listModules[index];

        // Does this module contain a front?
        if (await fs.hasAccess(`./${oneModule.path}`)) {
            // Write the file if it's not already in it
            await setFrontModuleInTheme(oneModule.path, theme || global.envConfig.environment.currentTheme);
        }
    }
};

/**
 * Add in the file /{myfront}/modules/list_modules.js the import(s) allowing to use the front of the module in the theme
 * @param {*} pathModule : module path
 * @param {*} theme : theme
 */
const setFrontModuleInTheme = async (pathModule, theme) => {
    const savePath = pathModule.replace('theme_components', '');
    console.log(`Set module's front files... ${pathModule}`);

    // On regarde si le dossier theme_components existe dans le module, si c'est le cas, alors c'est un module front
    if (!await fs.hasAccess(pathModule)) return;
    const currentTheme = theme || global.envConfig.environment.currentTheme; // serviceTheme.getThemePath(); // Bug
    const resultDir    = await fs.readdir(pathModule);

    // For each module front file
    for (let i = 0; i < resultDir.length; i++) {
        const file = resultDir[i];
        if (!file.startsWith('Module') || !file.endsWith('.js')) {
            continue;
        }
        const info                  = await fs.readFile(path.resolve(savePath, 'info.json'));
        let type                    = JSON.parse(info).info.type;
        type                        = type ? `type: '${type}'` : '';
        const fileNameWithoutModule = file.replace('Module', '').replace('.js', '').toLowerCase(); // ModuleComponentName.js -> namecomponent
        const jsxModuleToImport     = `{ jsx: require('./${file}'), code: 'aq-${fileNameWithoutModule}', ${type} },`;
        const pathListModules       = path.resolve(`themes/${currentTheme}/modules/list_modules.js`);
        const result                = await fs.readFile(pathListModules, 'utf8');

        // file don't contain module name
        if (result.indexOf(fileNameWithoutModule) <= 0) {
            const exportDefaultListModule = result.match(new RegExp(/\[(.*?)\]/, 'g'))[0];
            const replaceListModules      = `export default ${exportDefaultListModule.slice(0, exportDefaultListModule.lastIndexOf(']'))} ${jsxModuleToImport}]`;
            await fs.writeFile(pathListModules, replaceListModules, {flags: 'w'});
        }

        // Copy the files (of the module) needed by the front
        const copyTo  = `./themes/${currentTheme}/modules/${file}`;
        const copyTab = [`themes/${currentTheme}/modules/${file}`];
        // Set the theme components files for each theme to be able to delete them
        await Modules.updateOne({path: savePath}, {$push: {files: copyTab}});
        fs.copyFileSync(path.resolve(pathModule, file), copyTo);
        console.log(`Copy module's files front : ${path.resolve(pathModule, file)} -> ${copyTo}`);
    }
};

/**
 * Add or delete a front's module
 * @param {string} pathThemeComponents path to the front component of the module. ie: "modules/my-module-aquila/theme_components"
 * @param {boolean} toRemove if true then we delete the files in "themes/currentTheme/modules" and "themes/currentTheme/list_modules"
 */
const addOrRemoveThemeFiles = async (pathThemeComponents, toRemove, type) => {
    // Check if the theme_components folder exists in the module, then it's a front module
    if (!fs.existsSync(pathThemeComponents)) return;
    const currentTheme = global.envConfig.environment.currentTheme;
    if (toRemove) {
        for (const file of await fs.readdir(pathThemeComponents)) {
            if (!file.startsWith('Module') || !file.endsWith('.js')) continue;
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
        }
    } else {
        await setFrontModuleInTheme(pathThemeComponents, currentTheme);
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
const removeImport = async (jsxModuleToImport, exportDefaultListModule, pathListModules) => {
    // We remove the spaces
    const objectToRemove = jsxModuleToImport.replace(/\s+/g, '');
    // We remove the spaces from the information contained in the export table
    exportDefaultListModule = exportDefaultListModule.replace(/\s+/g, '');
    // We replace with "" the object to be deleted from the file
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
    // If it is a module containing a job then we delete the job in the agendaJobs collection
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
 * @deprecated
 */
const setConfig = async (name, newConfig) => {
    return Modules.updateOne({name}, {$set: {config: newConfig}}, {new: true});
};

/**
 * Used to define the configuration (conf field) of a module
 * @param body {object} datas of the request
 * @returns {Promise<*>} Returns the content of the md file corresponding to the name of the module
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