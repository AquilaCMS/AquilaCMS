const mongoose                     = require('mongoose');
const nextBuild                    = require('next/dist/build').default;
const path                         = require('path');
const fs                           = require('../utils/fsp');
const packageManager               = require('../utils/packageManager');
const encryption                   = require('../utils/encryption');
const NSErrors                     = require('../utils/errors/NSErrors');
const modulesUtils                 = require('../utils/modules');
const {isProd}                     = require('../utils/server');
const {Configuration, ThemeConfig} = require('../orm/models');

const CSS_FOLDERS = [
    'public/static/css',
    'public/css',
    'static/css',
    'css',
    'styles'
];

const save = async (environment) => {
    const oldConfig = await Configuration.findOne({});
    let maintenance = false;
    if (oldConfig && oldConfig.environment && oldConfig.environment.autoMaintenance === true && oldConfig.environment.maintenance === false) {
        oldConfig.environment.maintenance = true;
        await Configuration.updateOne({_id: oldConfig._id}, {$set: {environment: oldConfig.environment}});
        maintenance = true;
    }

    if (environment && environment.mailPass !== undefined && environment.mailPass !== '') {
        environment.mailPass = encryption.cipher(environment.mailPass);
    }
    await Configuration.updateOne({}, {environment});
    // Si le theme a changé
    if (oldConfig.environment.currentTheme !== environment.currentTheme) {
        console.log('Setup selected theme...');
        try {
            await require('./modules').setFrontModules(environment.currentTheme);
            await setConfigTheme(environment.currentTheme);
            await installDependencies(environment.currentTheme);
            if (oldConfig && oldConfig.environment && oldConfig.environment.autoMaintenance === true && oldConfig.environment.maintenance === true && maintenance === true) {
                environment.maintenance = false;
                await Configuration.updateOne({_id: oldConfig._id}, {$set: {environment}});
            }
            await buildTheme(environment.currentTheme);
        } catch (err) {
            console.error(err);
        }
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
        } else if (JSON.parse(packageTheme.getData().toString()).name !== originalname.replace('.zip', '')) {
            throw NSErrors.ThemeNameMissmatch;
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
        if (await fs.access(`${target_path_full.replace('.zip', '/')}next.config.js`)) {
            if (await fs.access(target_path_full)) {
                await fs.unlink(target_path_full);
            }
            console.log('New theme is ready to be selected (need to build)');
            await modulesUtils.createListModuleFile(`${themeName}`);
            return themeName;
        }
        console.log(`Remove theme : ${target_path_full}...`);
        await fs.deleteRecursiveSync(target_path_full.replace('.zip', '/'));
        console.log('Theme removed !');
        return themeName;
    }
    throw NSErrors.InvalidFile;
};

/**
 * @description setConfigTheme
 * @param theme : String Theme selectionné
 */
const setConfigTheme = async (theme) => {
    console.log('Setting configuration for the theme...');
    try {
        const data      = await fs.readFile(`./themes/${theme}/themeConfig.json`);
        const info      = data.toString();
        const config    = JSON.parse(info);
        const oldConfig = await ThemeConfig.findOne({name: theme});
        if (oldConfig) {
            const mergedConfig = {...config, ...oldConfig.config}; // On merge l'ancienne et la nouvelle config pour pas perdre les données
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
    await packageManager.execCmd(`yarn install${isProd() ? ' --prod' : ''}`, cmdTheme);
};

/**
 * @description Remove selected theme
 * @param themePath : Theme selectionné
 */
const deleteTheme = async (themePath) => {
    // Bloquer la suppression du theme courant, ou le theme par default
    const currentTheme = await getThemePath();
    if (!themePath || themePath === '' || themePath === currentTheme || themePath === 'default_theme') {
        throw NSErrors.DesignThemeRemoveCurrent;
    }
    await removeConfigTheme(themePath);
    const complete_Path = `themes/${themePath}`;
    console.log(`Remove theme : ${complete_Path}...`);
    if (await fs.access(path.join(global.appRoot, complete_Path))) {
        await fs.deleteRecursiveSync(path.join(global.appRoot, complete_Path));
    }
    console.log('Theme removed !');
};

/**
 * @description Copy datas of selected theme models can be a .json or a .js
 * @param {String} themePath : Selected theme
 * @param {Boolean} override : Override datas if exists
 */
const copyDatas = async (themePath, override = true, fileNames, configuration = null) => {
    const themeDemoData = path.join(global.appRoot, 'themes', themePath, 'demoDatas');
    const data          = [];
    const listOfFile    = [];
    if (!fs.existsSync(themeDemoData)) {
        return {data, noDatas: true};
    }
    await fs.access(themeDemoData, fs.constants.R_OK);
    const listOfPath = (await fs.readdir(themeDemoData)).map((value) => path.join(themeDemoData, value));
    if (fileNames === undefined) {
        listOfPath.foreach((element) => {
            listOfFile.push(element);
        });
    } else {
        let themeconf = false;
        for (let j = 0; j < listOfPath.length; j++) {
            for (let i = 0; i < fileNames.length; i++) {
                if (listOfPath[j].indexOf('themeConfig.json') === -1 && themeconf === false) {
                    if ( listOfPath[j].indexOf(fileNames[i].name) !== -1) {
                        if (fileNames[i].value === true) {
                            listOfFile.push(listOfPath[j]);
                        }
                    }
                } else if (listOfPath[j].indexOf('themeConfig.json') !== -1 && themeconf === false) {
                    listOfFile.push(listOfPath[j]);
                    themeconf = true;
                }
            }
        }
    }
    for (const value of listOfFile) {
        if ((await fs.lstat(value)).isDirectory()) {
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
                    console.error(err);
                }
            }
        }
    }
    if (configuration === null) {
        configuration = await Configuration.findOne();
    }
    const photoPath = path.join(global.appRoot, require('../utils/server').getUploadDirectory());
    await fs.mkdir(photoPath, {recursive: true});
    if (!await fs.access(path.join(themeDemoData, 'files'), fs.constants.R_OK)) {
        throw new Error(`"${path.join(themeDemoData, 'files')}" is not readable`);
    }
    if (!await fs.access(photoPath, fs.constants.OK)) {
        throw new Error(`"${photoPath}" is not writable`);
    }
    await fs.copyRecursiveSync(path.join(themeDemoData, 'files'), photoPath, override);
    return data;
};

/**
 * @description Récupère le contenu du fichier cssName.css
 * @param {string} cssName : Nom de la css a récupérer
 */
const getCustomCss = async (cssName) => {
    const themePath = getThemePath();
    for (const cssFolder of CSS_FOLDERS) {
        const fullPath = path.join('./themes', themePath, cssFolder, `${cssName}.css`);
        try {
            if (fs.existsSync(fullPath)) {
                return fs.readFile(fullPath);
            }
        } catch (err) {
            console.error(err);
        }
    }
    throw NSErrors.DesignThemeCssGetAll;
};

/**
 * @description Enregistre le contenu dans le fichier cssName.css
 * @param {string} cssName : Nom de la css a editer
 * @param {string} cssValue : Contenu à écrire dans le fichier
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
 * @description Récupère la liste des css du dossier
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
    await nextBuild(path.resolve(global.appRoot, 'themes', theme));
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

module.exports = {
    save,
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
    loadTranslation
};