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
        console.error('This command is used to build a theme');
        console.error('> No theme specified in parameter of the command');
        console.log('Example of use: `npm run build default_theme`');
        // throw new Error();
    }
};

buildOneTheme();