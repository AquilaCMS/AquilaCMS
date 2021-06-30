const path        = require('path');
const fs          = require('fs');
const utilsThemes = require('./themes');

/**
 * ONLY npm run build "theme"
 */
/* eslint-disable */
const buildOneTheme = async () => {
    const [nodePath, filePath, ...args] = process.argv;
    // simulate global
    global = {
        appRoot : path.join(__dirname, '../')
    };
    if (args && args[0]) {
        const pathToTheme = path.join(global.appRoot, 'themes', args[0], '/');
        if (fs.existsSync(pathToTheme)) {
            await utilsThemes.yarnBuildCustom(args[0]);
        } else {
            console.error(`Can't access to ${pathToTheme}`);
            // throw new Error(`Can't access to ${pathToTheme}`);
        }
    } else {
        console.error('No theme specified');
        // throw new Error();
    }
};

buildOneTheme();