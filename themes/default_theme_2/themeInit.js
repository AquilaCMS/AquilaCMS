const path                              = require('path');
const fs                                = require('fs');
const next                              = require('next');
const { execCmd, decodeBase64ToObject } = require('aql-utils');
const serverUtils                       = require('../../utils/server');
const dev                               = serverUtils.dev;

const themeName = path.basename(__dirname);

global.aquila = decodeBase64ToObject(global.aquila);

const pathToTheme = path.join(global.aquila.appRoot, 'themes', themeName, '/');

const start = async () => {
    const app   = next({ dev, dir: pathToTheme });
    let handler = app.getRequestHandler();

    createDotEnvIfNotExists();
    createCustomCSSIfNotExists();
    createListModulesIfNotExists();
    
    console.log('next build start...');
    await app.prepare();
    console.log('next build finish');
    return handler;
};


const build = async () => {
    createDotEnvIfNotExists();
    createCustomCSSIfNotExists();
    createListModulesIfNotExists();
    await execCmd('npx next build', pathToTheme);
};

const createCustomCSSIfNotExists = () => {
    console.log('createCustomCSSIfNotExists');
    // Create file if not exists
    const customCssPath = path.join(pathToTheme, 'styles', 'custom.css');
    if (!fs.existsSync(customCssPath)) {
        fs.writeFileSync(customCssPath, '');
    }
};

const createDotEnvIfNotExists = () => {
    console.log('createDotEnvIfNotExists()...');
    const dotEnvPath = path.join(pathToTheme, '.env');
    if (!fs.existsSync(dotEnvPath)) {
        let appUrl = '';
        if (!global?.aquila?.envConfig?.environment?.appUrl) {
            throw new Error('"appUrl" is not defined in your configuration.');
        }
    
        appUrl                          = global.aquila.envConfig.environment.appUrl.slice(0, -1);
        const nextApiValue              = `${appUrl}/api`;
        process.env.NEXT_PUBLIC_API_URL = nextApiValue;
        const data                      = `NEXT_PUBLIC_API_URL=${nextApiValue}`;
    
        fs.writeFileSync(dotEnvPath, data);
    }
};

const createListModulesIfNotExists = async () => {
    console.log('createListModulesIfNotExists');
    // Create folder "modules" if not exists
    const modulesPath = path.join(pathToTheme, 'modules');
    if (!fs.existsSync(modulesPath)) {
        fs.mkdirSync(modulesPath);
    }
    // Create file if not exists
    const listModulePath = path.join(modulesPath, 'list_modules.js');
    if (!fs.existsSync(listModulePath)) {
        fs.writeFileSync(listModulePath, 'export default [];');
    }
};

module.exports = {
    start,
    build
};
