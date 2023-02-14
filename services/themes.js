/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose                     = require('mongoose');
const path                         = require('path');
const {fs}                         = require('aql-utils');
const NSErrors                     = require('../utils/errors/NSErrors');
const themesUtils                  = require('../utils/themes');
const modulesUtils                 = require('../utils/modules');
const ServiceLanguages             = require('./languages');
const {Configuration, ThemeConfig} = require('../orm/models');
const updateService                = require('./update');

const CSS_FOLDERS = [
    'public/static/css',
    'public/css',
    'static/css',
    'css',
    'styles'
];

/**
 * Set theme
 * @param {string} selectedTheme Name of the selected theme
 */
const changeTheme = async (selectedTheme, type) => {
    const oldConfig = await Configuration.findOne({});
    // If the theme has changed
    const returnObject = {
        message : '',
        success : true
    };
    try {
        if (type === 'before' && oldConfig.environment.currentTheme !== selectedTheme) {
            console.log(`Setup selected theme: ${selectedTheme}`);
            await updateService.setMaintenance(true);
            await require('./modules').frontModuleComponentManagement(selectedTheme);
            return returnObject;
        }
        if (type === 'after') {
            await Configuration.updateOne({}, {$set: {'environment.currentTheme': selectedTheme}});
            await updateService.setMaintenance(false);
            returnObject.msg = 'OK';
            return returnObject;
        }
    } catch (err) {
        console.error(err);
        returnObject.message = err;
        returnObject.success = false;
        return returnObject;
    }
    throw NSErrors.SameTheme;
};

/**
 * Upload, unzip and install theme
 * @param {string} originalname original file name
 * @param {string} filepath temporary file position
 */
const uploadTheme = async (originalname, filepath) => {
    if (path.extname(originalname) === '.zip') {
        const tmp_path         = filepath;
        const target_path      = path.join(global.aquila.appRoot, 'themes');
        const target_path_full = path.join(target_path, originalname);
        console.log(`Uploading theme to : ${target_path_full}`);

        // move the file from the temporary location to the intended location
        fs.copyFileSync(tmp_path, target_path_full);
        await fs.unlink(tmp_path);

        // Unzip
        console.log('Unziping new theme...');
        const AdmZip       = require('adm-zip');
        const zip          = new AdmZip(target_path_full);
        const themeName    = originalname.slice(0, -4); // remove ".zip"
        const packageTheme = zip.getEntry(`${themeName}/package.json`);
        if (packageTheme) {
            const moduleAquilaVersion = JSON.parse(packageTheme.getData().toString()).aquilaVersion;
            if (moduleAquilaVersion) {
                const packageAquila = (await fs.readFile(path.resolve(global.aquila.appRoot, 'package.json'), 'utf8')).toString();
                const aquilaVersion = JSON.parse(packageAquila).version;
                if (!require('semver').satisfies(aquilaVersion.replace(/\.0+/g, '.'), moduleAquilaVersion.replace(/\.0+/g, '.'))) {
                    throw NSErrors.ThemeAquilaVersionNotSatisfied;
                }
            }
        } else {
            console.log('No package.json found in the zip file');
        }
        zip.extractAllTo(target_path, /* overwrite */true);
        if (await fs.hasAccess(target_path_full)) {
            await fs.unlink(target_path_full);
        }
        console.log('New theme is ready to be selected (need to build)');
        await modulesUtils.createListModuleFile(`${themeName}`);
        return themeName;
    }
    throw NSErrors.InvalidFile;
};

/**
 * @description removeConfigTheme
 * @param theme : String Theme selectionné
 */
async function removeConfigTheme(theme) {
    console.log('Removing configuration for the theme...');
    try {
        await ThemeConfig.deleteOne({name: theme});
    } catch (err) {
        // nothing
    }
}

/**
 * @description Install dependencies
 * @param theme : String Theme selectionné
 */
const installDependencies = async (theme) => {
    console.log("Installing new theme's dependencies...");
    return themesUtils.yarnInstall(theme, false);
};

/**
 * @description Remove selected theme
 * @param themePath : Theme selectionné
 */
const deleteTheme = async (themePath) => {
    // Block delete of the current theme, or the default theme
    const currentTheme = await getThemePath();
    if (!themePath || themePath === '' || themePath === currentTheme || themePath === 'default_theme_2') {
        throw NSErrors.DesignThemeRemoveCurrent;
    }
    await removeConfigTheme(themePath);
    const complete_Path = `themes/${themePath}`;
    console.log(`Remove theme : ${complete_Path}...`);
    const pathToTheme = path.join(global.aquila.appRoot, complete_Path);
    if (await fs.hasAccess(pathToTheme)) {
        const nodeModulesContent = await themesUtils.yarnDeleteNodeModulesContent(themePath);
        console.log(nodeModulesContent.stdout);
        await fs.deleteRecursive(pathToTheme);
    }
    console.log('Theme removed !');
};

const getDemoDatasFilesName = async () => {
    const folder = path.join(global.aquila.appRoot, `themes/${global.aquila.envConfig.environment.currentTheme}/demoDatas`);
    if (!fs.existsSync(folder)) {
        return [];
    }
    const fileNames = await fs.readdir(folder);
    for ( let i = (fileNames.length - 1); i >= 0; i--) {
        if (fileNames[i].indexOf('json') === -1) {
            if (fileNames[i] === 'files') {
                const pathToFile = path.join(folder, fileNames[i]);
                if (await fs.hasAccess(pathToFile)) {
                    const listOfFile = await fs.readdir(pathToFile);
                    if (listOfFile && listOfFile.length !== 0) {
                        // there are files
                        fileNames.splice(i, 1, {name: fileNames[i], value: true});
                        continue;
                    }
                }
            }
            fileNames.splice(i, 1);
        } else {
            fileNames.splice(i, 1, {name: fileNames[i], value: true});
        }
    }
    return fileNames;
};
/**
 * @description Copy datas of selected theme models can be a .json or a .js
 * @param {String} themePath : Selected theme
 * @param {Boolean} override : Override datas if exists
 */
const copyDatas = async (themePath, override = true, configuration = null, fileNames = null) => {
    const themeDemoData = path.join(global.aquila.appRoot, 'themes', themePath, 'demoDatas');
    const data          = [];
    let listOfFile      = [];
    if (!fs.existsSync(themeDemoData)) {
        return {data, noDatas: true};
    }
    if (!await fs.hasAccess(themeDemoData)) {
        return data;
    }
    const listOfDemoDatasFiles = await fs.readdir(themeDemoData);
    const listOfPath           = listOfDemoDatasFiles.map((value) => path.join(themeDemoData, value));
    if (!fileNames && listOfPath) {
        listOfFile = listOfPath;
    } else {
        listOfFile = listOfPath.filter((onePath) => {
            if (fs.lstatSync(onePath).isDirectory() && !onePath.endsWith('files')) return false;
            const fileName = path.basename(onePath);
            const index    = fileNames.findIndex((elementInFileName) => fileName === elementInFileName.name);
            return (index > -1 && fileNames[index].value === true);
        });
    }
    const photoPath = path.join(global.aquila.appRoot, require('../utils/server').getUploadDirectory());
    await fs.mkdir(photoPath, {recursive: true});

    for (const value of listOfFile) {
        if ((await fs.lstat(value)).isDirectory()) { // Only for the "files"
            if (value.endsWith('files') && override) {
                if (!(await fs.hasAccess(photoPath, fs.constants.W_OK))) {
                    throw new Error(`"${photoPath}" is not writable`);
                }
                await fs.copyRecursive(value, photoPath, override);
            }
            continue;
        }
        let file;
        if (path.extname(value) === '.js') {
            file = require(value);
        } else if (path.extname(value) === '.json') {
            const fileContent = await fs.readFile(value, {encoding: 'UTF-8'});
            file              = JSON.parse(fileContent);
        } else {
            continue;
        }

        if (!file.collection || [...mongoose.modelNames()].indexOf(file.collection) === -1) {
            data.push({
                collection : file.collection ? `${file.collection} doesn't exist in ${value}` : `param collection in ${value} doesn't exist`
            });
        } else {
            const model = mongoose.model(file.collection);
            if (['index', 'users', 'configuration'].indexOf(file.collection) !== -1) {
                data.push({
                    collection : `${file.collection} : you can't import index, users and configuration`
                });
            } else {
                try {
                    if (override) {
                        await model.deleteMany({});
                    }
                    const result = await model.insertMany(file.datas, null, null);
                    data.push({
                        collection : `${file.collection}`,
                        data       : [...result]
                    });
                } catch (err) {
                    // error can occur when the "override" is set to false
                    console.error(err);
                }
            }
        }
    }
    if (configuration === null) {
        configuration = await Configuration.findOne();
    }
    return data;
};

/**
 * @description Get content of the file cssName.css
 * @param {string} cssName : Name of the css to recover
 */
const getCustomCss = async (cssName) => {
    const themePath = getThemePath();
    for (const cssFolder of CSS_FOLDERS) {
        const fullPath = path.join(global.aquila.appRoot, 'themes', themePath, cssFolder, `${cssName}.css`);
        try {
            if (fs.existsSync(fullPath)) {
                return (await fs.readFile(fullPath)).toString();
            }
        } catch (err) {
            console.error(err);
        }
    }
    throw NSErrors.DesignThemeCssGetAll;
};

/**
 * @description Saves the content in the file cssName.css
 * @param {string} cssName : Name of the css to edit
 * @param {string} cssValue : Content to be written in the file
 */
const setCustomCss = async (cssName, cssValue) => {
    const themePath = getThemePath();

    for (const cssFolder of CSS_FOLDERS) {
        const fullPath = path.join(global.aquila.appRoot, 'themes', themePath, cssFolder, `${cssName}.css`);
        try {
            if (fs.existsSync(fullPath)) {
                await fs.writeFile(fullPath, cssValue);
                return;
            }
        } catch (err) {
            console.error(err);
            throw NSErrors.DesignThemeCssSave;
        }
    }
    throw NSErrors.DesignThemeCssGetAll;
};

/**
 * @description Get the list of css in the folder
 */
const getAllCssComponentName = async () => {
    try {
        const cssNames  = [];
        const themePath = getThemePath();
        for (const cssFolder of CSS_FOLDERS) {
            const fullPath = path.join(global.aquila.appRoot, 'themes', themePath, cssFolder);
            try {
                if (fs.existsSync(fullPath)) {
                    for (const file of await fs.readdir(fullPath)) {
                        if (file.endsWith('.css')) {
                            cssNames.push(file.substring(0, file.lastIndexOf('.css')));
                        }
                    }
                }
            } catch (err) {
                if (err.code === 'ENOENT') {
                    console.log(`can't find css in folder "${fullPath}"`);
                } else {
                    console.error(err);
                }
            }
        }
        return cssNames;
    } catch (error) {
        throw NSErrors.DesignThemeCssGetAll;
    }
};

/**
 * @description Get path of the current theme
 */
function getThemePath() {
    return global.aquila.envConfig.environment.currentTheme;
}

/**
 * Compile theme
 * @param {String} theme
 */
async function buildTheme(theme) {
    try {
        // To let the theme manage the languages, it must come with a "languageInit.js" file
        const isLanguageInitHere = await languageInitExec(theme);
        // If there is no "languageInit.js" file, the language management will go through the "dynamic_lang.js" file which will be created at the root of the theme
        let isDynamicFileHere = 'KO';
        if (isLanguageInitHere !== 'OK') {
            isDynamicFileHere = await generateDynamicLangFile(theme);
        }
        if (isDynamicFileHere === 'OK' || isLanguageInitHere === 'OK') {
            const returnValues = await themesUtils.yarnBuildCustom(theme);
            if (returnValues?.stdout === 'Build failed') {
                return {
                    msg    : 'KO',
                    result : returnValues
                };
            }
            return {
                msg    : 'OK',
                result : returnValues
            };
        }
        return {
            msg    : 'KO',
            result : 'No lang file'
        };
    } catch (err) {
        return {
            msg   : 'KO',
            error : err
        };
    }
}

async function languageManagement(theme = global.aquila.envConfig.environment.currentTheme) {
    const pathToTheme = path.join(global.aquila.appRoot, 'themes', theme, '/');
    if (fs.existsSync(path.join(pathToTheme, 'languageInit.js'))) {
        await languageInitExec(theme);
    } else {
        await ServiceLanguages.createDynamicLangFile(theme);
    }
    return 'OK';
}

async function languageInitExec(theme = global.aquila.envConfig.environment.currentTheme) {
    let returnValues;
    try {
        const pathToTheme        = path.join(global.aquila.appRoot, 'themes', theme);
        const pathToLanguageInit = path.join(pathToTheme, 'languageInit.js');
        const isExist            = await fs.existsSync(pathToLanguageInit);
        if (isExist) {
            const langs = await ServiceLanguages.getLanguages({filter: {status: 'visible'}, limit: 100, structure: {code: 1, position: 1}});

            const sortedLangs = langs.datas.sort((a, b) => {
                if (a.position < b.position) {
                    return -1;
                }
                if (a.position > b.position) {
                    return 1;
                }
                return 0;
            });

            const tabLang     = sortedLangs.map((_lang) => _lang.code);
            const defaultLang = await ServiceLanguages.getDefaultLang();

            returnValues = await themesUtils.execThemeFile(pathToLanguageInit, `setLanguage('${tabLang}','${defaultLang}')`, pathToTheme);
            if (returnValues.stderr === '') {
                console.log('Language init exec log : ', returnValues.stdout);
            } else {
                returnValues.stdout = 'Language init exec failed';
                console.error(returnValues.stderr);
            }
            return 'OK';
        }
        return 'KO';
    } catch (err) {
        return {
            msg   : 'KO',
            error : err
        };
    }
}

async function generateDynamicLangFile(theme) {
    try {
        const pathToTheme = path.join(global.aquila.appRoot, 'themes', theme);
        // "dynamic_langs.js" is required to build (reactjs) theme
        const pathToDynamicLangs = path.join(pathToTheme, 'dynamic_langs.js');
        const isExist            = await fs.existsSync(pathToDynamicLangs);
        if (!isExist) {
            // Create the file if not exist
            await ServiceLanguages.createDynamicLangFile(theme);
        }
        return 'OK';
    } catch (err) {
        return {
            msg   : 'KO',
            error : err
        };
    }
}

const loadTranslation = async (server, express, i18nInstance, i18nextMiddleware, ns) => {
    if (i18nInstance) {
        await require('../utils/translation').initI18n(i18nInstance, ns);
        server.use(i18nextMiddleware.handle(i18nInstance));
        server.use('/locales', express.static(path.join(
            global.aquila.appRoot,
            'themes',
            global.aquila.envConfig.environment.currentTheme,
            'assets/i18n'
        )));
    }
};

const listTheme = async () => {
    const allTheme    = [];
    const pathToTheme = path.join(global.aquila.appRoot, 'themes');
    const listOfFile  = await fs.readdir(pathToTheme);
    for (const element of listOfFile) {
        const pathToFolder = path.join(pathToTheme, element);
        const fileOrFolder = await fs.stat(pathToFolder);
        if (fileOrFolder.isDirectory()) {
            allTheme.push(element);
        }
    }
    return allTheme;
};

const installTheme = async (themeName = '', devDependencies = false) => {
    try {
        const returnValues = await themesUtils.yarnInstall(themeName, devDependencies);
        return {
            msg    : 'OK',
            result : returnValues
        };
    } catch (err) {
        return {
            msg   : 'KO',
            error : err
        };
    }
};

module.exports = {
    changeTheme,
    installDependencies,
    buildTheme,
    uploadTheme,
    deleteTheme,
    copyDatas,
    getCustomCss,
    setCustomCss,
    getAllCssComponentName,
    getThemePath,
    loadTranslation,
    listTheme,
    getDemoDatasFilesName,
    installTheme,
    languageManagement
};