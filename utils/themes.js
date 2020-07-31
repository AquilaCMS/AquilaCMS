const path = require('path');
const packageManager = require('./packageManager');
const modulesUtils = require('./modules');

/**
 * Compile the current theme
 */
const themeCompile = async () => {
    try {
        try {
            const currentTheme = path.join('./themes', global.envConfig.environment.currentTheme);
            if (!global.envFile.db) {
                await packageManager.execCmd('yarn install', `${currentTheme}`);
            }
            await packageManager.execSh(
                `${path.normalize('./node_modules/next/dist/bin/next')} build ${currentTheme}`,
                [],
                './'
            );
        } catch (err) {
            console.error(err);
        }
    } catch (err) {
        console.error(err);
    }
};

/**
 * Set current theme at startup from envFile.currentTheme
 */
const loadTheme = async () => {
    await modulesUtils.createListModuleFile();
    await modulesUtils.displayListModule();

    // Language with i18n
    let i18nInstance = null;
    let ns = null;
    try {
        const oI18n = require(path.join(global.appRoot, 'themes', global.envConfig.environment.currentTheme, 'i18n'));
        i18nInstance = oI18n.i18nInstance;
        ns = oI18n.ns;
    } catch (error) {
        console.error(error);
    }

    return {i18nInstance, ns};
};

module.exports = {
    themeCompile,
    loadTheme
};