/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose                     = require('mongoose');
const nextBuild                    = require('next/dist/build').default;
const path                         = require('path');
const fs                           = require('../utils/fsp');
const packageManager               = require('../utils/packageManager');
const NSErrors                     = require('../utils/errors/NSErrors');
const modulesUtils                 = require('../utils/modules');
const {isProd}                     = require('../utils/server');
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
const changeTheme = async (selectedTheme) => {
    const oldConfig = await Configuration.findOne({});

    // If the theme has changed
    if (oldConfig.environment.currentTheme !== selectedTheme) {
        console.log(`Setup selected theme: ${selectedTheme}...`);
        try {
            await updateService.setMaintenance(true);
            await Configuration.updateOne({}, {$set: {'environment.currentTheme': selectedTheme}}); // TODO : maybe move this call after buildTheme()

            await require('./modules').setFrontModules(selectedTheme);
            // await setConfigTheme(selectedTheme);
            await installDependencies(selectedTheme);
            await buildTheme(selectedTheme);

            await updateService.setMaintenance(false);
        } catch (err) {
            console.error(err);
        }
    } else {
        throw NSErrors.SameTheme;
    }
};

/**
 * Upload, unzip and install theme
 * @param {string} originalname original file name
 * @param {string} filepath temporary file position
 */
const uploadTheme = async (originalname, filepath) => {
    if (path.extname(originalname) === '.zip') {
        const tmp_path         = filepath;
        const target_path      = './themes/';
        const target_path_full = path.resolve(target_path, originalname);
        console.log(`Uploading theme to : ${target_path_full}`);

        // move the file from the temporary location to the intended location
        fs.copyFileSync(tmp_path, target_path_full);
        await fs.unlink(tmp_path);

        // Unzip
        console.log('Unziping new theme...');
        const AdmZip       = require('adm-zip');
        const zip          = new AdmZip(target_path_full);
        const packageTheme = zip.getEntry(`${originalname.replace('.zip', '/')}package.json`);
        if (!packageTheme) {
            throw NSErrors.ThemePackageNotFound; // info.json not found in zip
        }
        const moduleAquilaVersion = JSON.parse(packageTheme.getData().toString()).aquilaVersion;
        if (moduleAquilaVersion) {
            const packageAquila = (await fs.readFile(path.resolve(global.appRoot, 'package.json'), 'utf8')).toString();
            const aquilaVersion = JSON.parse(packageAquila).version;
            if (!require('semver').satisfies(aquilaVersion.replace(/\.0+/g, '.'), moduleAquilaVersion.replace(/\.0+/g, '.'))) {
                throw NSErrors.ThemeAquilaVersionNotSatisfied;
            }
        }
        zip.extractAllTo(target_path, /* overwrite */true);
        const themeName = originalname.split('.')
            .slice(0, -1)
            .join('.');
        if (await fs.hasAccess(`${target_path_full.replace('.zip', '/')}next.config.js`)) {
            if (await fs.hasAccess(target_path_full)) {
                await fs.unlink(target_path_full);
            }
            console.log('New theme is ready to be selected (need to build)');
            await modulesUtils.createListModuleFile(`${themeName}`);
            return themeName;
        }
        console.log(`Remove theme : ${target_path_full}...`);
        await fs.deleteRecursive(target_path_full.replace('.zip', '/'));
        console.log('Theme removed !');
        return themeName;
    }
    throw NSErrors.InvalidFile;
};

/**
 * @description setConfigTheme
 * @param theme : String Theme selectionné
 * @deprecated
 */
const setConfigTheme = async (theme) => {
    console.log('Setting configuration for the theme...');
    try {
        const data      = await fs.readFile(`./themes/${theme}/themeConfig.json`);
        const info      = data.toString();
        const config    = JSON.parse(info);
        const oldConfig = await ThemeConfig.findOne({name: theme});
        if (oldConfig) {
            const mergedConfig = {...config, ...oldConfig.config}; // We merge the old and the new configuration to not lose the data
            await ThemeConfig.updateOne({name: theme}, {$set: {name: theme, config: mergedConfig}});
        } else {
            await ThemeConfig.create({name: theme, config});
        }
    } catch (err) {
        // nothing
    }
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
    console.log('Installing new theme\'s dependencies...');
    const cmdTheme = `./themes/${theme}`;
    await packageManager.execCmd(`yarn install${isProd ? ' --prod' : ''}`, cmdTheme);
};

/**
 * @description Remove selected theme
 * @param themePath : Theme selectionné
 */
const deleteTheme = async (themePath) => {
    // Block delete of the current theme, or the default theme
    const currentTheme = await getThemePath();
    if (!themePath || themePath === '' || themePath === currentTheme || themePath === 'default_theme') {
        throw NSErrors.DesignThemeRemoveCurrent;
    }
    await removeConfigTheme(themePath);
    const complete_Path = `themes/${themePath}`;
    console.log(`Remove theme : ${complete_Path}...`);
    if (await fs.hasAccess(path.join(global.appRoot, complete_Path))) {
        await fs.deleteRecursive(path.join(global.appRoot, complete_Path));
    }
    console.log('Theme removed !');
};

const getDemoDatasFilesName = async () => {
    const folder = path.join(global.appRoot, `themes/${global.envConfig.environment.currentTheme}/demoDatas`);
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
    const themeDemoData = path.join(global.appRoot, 'themes', themePath, 'demoDatas');
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
            const index = fileNames.findIndex((elementInFileName) => onePath.includes(elementInFileName.name));
            return (index > -1 && fileNames[index].value === true);
        });
    }
    const photoPath = path.join(global.appRoot, require('../utils/server').getUploadDirectory());
    await fs.mkdir(photoPath, {recursive: true});
    if (!(await fs.hasAccess(path.join(themeDemoData, 'files')))) {
        throw new Error(`"${path.join(themeDemoData, 'files')}" is not readable`);
    }
    if (!(await fs.hasAccess(photoPath, fs.constants.W_OK))) {
        throw new Error(`"${photoPath}" is not writable`);
    }
    for (const value of listOfFile) {
        if ((await fs.lstat(value)).isDirectory()) {
            if (value.endsWith('files') && override) {
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
                    // console.log(`insertion of ${file.collection} in database`);
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
        const fullPath = path.join('./themes', themePath, cssFolder, `${cssName}.css`);
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
        const fullPath = path.join('./themes', themePath, cssFolder, `${cssName}.css`);
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
            const fullPath = path.join('./themes', themePath, cssFolder);
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
    return global.envConfig.environment.currentTheme;
}

/**
 * Compile theme
 * @param {String} theme
 */
async function buildTheme(theme) {
    try {
        // "dynamic_langs.js" is required to build (reactjs) theme
        if (!(await fs.existsSync(path.join(theme, 'dynamic_langs.js')))) {
            // Create if not exist
            await require('./languages').createDynamicLangFile();
        }

        const returnValues = await nextBuild(path.resolve(global.appRoot, 'themes', theme));
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
}

const loadTranslation = async (server, express, i18nInstance, i18nextMiddleware, ns) => {
    if (i18nInstance) {
        await require('../utils/translation').initI18n(i18nInstance, ns);
        server.use(i18nextMiddleware.handle(i18nInstance));
        server.use('/locales', express.static(path.join(
            global.appRoot,
            'themes',
            global.envConfig.environment.currentTheme,
            'assets/i18n'
        )));
    }
};

const listTheme = async () => {
    const allTheme = [];
    for (const element of await fs.readdir('./themes/')) {
        const fileOrFolder = await fs.stat(`./themes/${element}`);
        if (fileOrFolder.isDirectory()) {
            allTheme.push(element);
        }
    }
    return allTheme;
};

const installTheme = async (themeName = '', devDependencies = false) => {
    try {
        const linkToTheme = path.join(global.appRoot, 'themes', themeName);
        let command       = 'yarn install --production=true';
        if (devDependencies === true) {
            command = 'yarn install --production=false';
        }
        const returnValues = await packageManager.execCmd(command, path.join(linkToTheme, '/'));
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
    setConfigTheme,
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
    installTheme
};