const path                         = require('path');
const { fs, decodeBase64ToObject } = require('aql-utils');

const setLanguage = async (langs, defaultLanguage) => {
    const tabLangs  = langs.split(',');
    const themeName = path.basename(__dirname);

    global.aquila = decodeBase64ToObject(global.aquila);

    const pathToTheme    = path.join(global.aquila.appRoot, 'themes', themeName);
    const i18nSamplePath = path.join(pathToTheme, 'i18n.js.sample');
    const i18nFilePath   = path.join(pathToTheme, 'i18n.js');

    const json         = require(i18nSamplePath);
    json.locales       = tabLangs; // Replace or create "locales" property
    json.defaultLocale = defaultLanguage; // Replace or create "defaultLocale" property
    
    // Process to retrieve each module folder
    const anyPages        = json.pages['*'];
    const moduleThemePath = path.join(pathToTheme, 'modules');
    if (fs.existsSync(moduleThemePath)) {
        const moduleList = fs.readdirSync(path.join(pathToTheme, 'modules'), { withFileTypes: true })
            .filter((item) => item.isDirectory())
            .map((item) => item.name);
        for (const m of moduleList) {
            const modulePath = `modules/${m}`;
            // Check if the module have translations
            const moduleTranslationPath = path.join(pathToTheme, 'modules', m, 'translations');
            if (!fs.existsSync(moduleTranslationPath)) continue;
            anyPages.push(modulePath);
        }
    }
    json.pages['*'] = anyPages;

    const file = fs.readFileSync(i18nSamplePath);
    let res    = file.toString().replace(/locales[\s\t]*:.*/, `locales: ${JSON.stringify(json.locales)},`);
    res        = res.replace(/defaultLocale[\s\t]*:.*/, `defaultLocale: ${JSON.stringify(json.defaultLocale)},`);
    res        = res.replace(/pages[\s\t]*: {[^}]*/s, `pages: ${JSON.stringify(json.pages, null, 4).replace('}', '')}`);
    fs.writeFileSync(i18nFilePath, res);

    // Create the folder for each language if it does not exist by copying that of the default language
    await createTranslationFiles(tabLangs, defaultLanguage);

    console.log('Language initialization completed');
};

const createTranslationFiles = async (langs, defaultLanguage) => {
    const themeName   = path.basename(__dirname);
    const pathToTheme = path.join(global.aquila.appRoot, 'themes', themeName);
    let pathFrom      = path.join(pathToTheme, 'locales');

    // "locales" folder
    await copyTranslationFiles(langs, defaultLanguage, pathFrom);

    // "translations" folder for each module
    const moduleThemePath = path.join(pathToTheme, 'modules');
    if (fs.existsSync(moduleThemePath)) {
        const moduleList = fs.readdirSync(path.join(pathToTheme, 'modules'), { withFileTypes: true })
            .filter((item) => item.isDirectory())
            .map((item) => item.name);
        for (const m of moduleList) {
            pathFrom = path.join(pathToTheme, 'modules', m, 'translations');
            await copyTranslationFiles(langs, defaultLanguage, pathFrom);
        }
    }
};

const copyTranslationFiles = async (langs, defaultLanguage, pathFrom) => {
    let fromLang = defaultLanguage;

    let srcPathTranslation        = path.join(pathFrom, defaultLanguage);
    const srcPathTranslationFiles = fs.existsSync(srcPathTranslation) ? fs.readdirSync(srcPathTranslation) : null;
    if (!srcPathTranslationFiles || !srcPathTranslationFiles.length) {
        const rootPathTranslation      = path.join(pathFrom);
        if(!fs.existsSync(rootPathTranslation)) return;
        const otherTranslationLangPath = fs.readdirSync(rootPathTranslation).find((lang) => lang !== defaultLanguage);
        if (!otherTranslationLangPath) return;
        srcPathTranslation = path.join(pathFrom, otherTranslationLangPath);
        fromLang           = otherTranslationLangPath;
    }

    for (const lang of langs) {
        const pathTranslationFilesDest = path.join(pathFrom, lang);
        if (!fs.existsSync(pathTranslationFilesDest)) {
            console.log(`Create folder for language [${lang}] from [${fromLang}] in [${pathFrom}]`);
            await fs.copyRecursive(srcPathTranslation, pathTranslationFilesDest);
        }
    }
};

module.exports = {
    setLanguage
};