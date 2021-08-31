const fs = require('fs');
const path = require('path');
const next = require('next').default;
const express = require('express');
const i18nextMiddleware = require('i18next-http-middleware');
const fileSystemBackend = require('i18next-fs-backend');
const modulesUtils = require('../../utils/modules');
const serverUtils = require('../../utils/server');
const packageManager = require('../../utils/packageManager');
const dev = serverUtils.dev;

const themeName = path.basename(__dirname);
const pathToTheme = path.join(global.appRoot, "themes", themeName, "/");


const initI18n = async (i18nInstance, ns) => {
    const { Languages } = require('../../orm/models');
    const langs = (await Languages.find({}, { code: 1, _id: 0 })).map((elem) => elem.code);
    i18nInstance.use(fileSystemBackend).init({
        languages: langs,
        preload: langs,
        fallbackLng: langs,
        load: 'all',
        ns,
        fallbackNS: 'common',
        defaultNS: 'common',
        react: {
            wait: false
        },
        backend: {
            loadPath: path.join(pathToTheme, "/assets/i18n/{{lng}}/{{ns}}.json")
        }
    });
};

const loadTheme = async () => {
    await modulesUtils.createListModuleFile();
    await modulesUtils.displayListModule();

    // Language with i18n
    let i18nInstance = null;
    let ns = null;
    try {
        const oI18n = require(path.join(pathToTheme, 'i18n'));
        i18nInstance = oI18n.i18nInstance;
        ns = oI18n.ns;
    } catch (error) {
        console.error(error);
    }

    return { i18nInstance, ns };
};

const start = async (server) => {
    const app = next({ dev, dir: pathToTheme });
    let handler;
    if (fs.existsSync(path.join(pathToTheme, 'routes.js'))) {
        const routes = require(path.join(pathToTheme, 'routes'));
        handler = routes.getRequestHandler(app);
    } else {
        handler = app.getRequestHandler();
    }
    const { i18nInstance, ns } = await loadTheme();

    if (i18nInstance) {
        await initI18n(i18nInstance, ns);
        server.use(i18nextMiddleware.handle(i18nInstance));
        server.use('/locales', express.static(path.join(pathToTheme, 'assets/i18n')));
    }

    console.log('next build start...');
    await app.prepare();
    console.log('next build finish');
    return handler;
}


const build = async () => {
    await packageManager.execCmd(`npx next build`, pathToTheme);
}

module.exports = {
    start,
    build
};