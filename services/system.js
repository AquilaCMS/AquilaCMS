const path           = require('path');
const fs             = require('../utils/fsp');
const packageManager = require('../utils/packageManager');
const NSErrors       = require('../utils/errors/NSErrors');

const getLogsContent = async (fileName) => {
    const filePath = path.resolve(global.appRoot, fileName);
    if (await fs.hasAccess(filePath)) {
        let fileContent  = '';
        let currentLines = '';
        try {
            fileContent = await fs.readFile(filePath, 'utf8');
            if (fileContent) {
                const allLines    = fileContent.split('\n');
                const nbLinesFile = allLines.length;
                let nbLinesStart  = 0;
                let offset        = 0;
                // Read only the last logs
                if (nbLinesFile > 301) {
                    offset       = 300;
                    nbLinesStart = (nbLinesFile - offset);
                }
                for (let count = nbLinesStart; count < nbLinesFile; count++) {
                    if (allLines[count]) {
                        currentLines = `${currentLines}${allLines[count]}\n`;
                    }
                }
            } else {
                currentLines = 'None';
            }
            return {fileData: currentLines};
        } catch (err) {
            return {fileData: 'None'};
        }
    }
    return {fileData: 'None'};
};

const getNextVersion = async () => {
    const datas       = {};
    const pathToTheme = path.join(global.appRoot, 'themes', global?.envConfig?.environment?.currentTheme);
    if (fs.existsSync(path.join(pathToTheme, 'yarn.lock'))) {
        const result = await execCommand('yarn', ['info', 'next', 'versions', '--json']);
        let data     = result.stdout.split('}\n{');
        data         = data[data.length - 1];
        if (!data.startsWith('{')) {
            data = `{${data}`;
        }
        let currentVersion = await execCommand('yarn', ['list', '--pattern', 'next', '--json']);
        currentVersion     = JSON.parse(currentVersion.stdout).data.trees;
        for (const elem of currentVersion) {
            if (elem.name.startsWith('next@')) {
                currentVersion = elem.name;
                break;
            }
        }

        datas.actual   = currentVersion.slice(5);
        datas.versions = JSON.parse(data).data;
    } else {
        const nextInstalledVersion = await execCommand('npm', ['ls', 'next', '--json']);
        const listNextVersion      = await execCommand('npm', ['view', 'next', '--json']);
        datas.actual               = JSON.parse(nextInstalledVersion.stdout).dependencies.next.version;
        datas.versions             = JSON.parse(listNextVersion.stdout).versions;
    }
    return datas;
};

const changeNextVersion = async (body) => {
    const {nextVersion} = body;
    if (!nextVersion) throw NSErrors.UnprocessableEntity;
    let result;
    const pathToTheme = path.join(global.appRoot, 'themes', global?.envConfig?.environment?.currentTheme, '/');
    if (fs.existsSync(path.join(pathToTheme, 'yarn.lock'))) {
        result = await execCommand('yarn', ['add', `next@${nextVersion}`]);
    } else {
        result = await execCommand('npm', ['install', `next@${nextVersion}`]);
    }
    if (result.code !== 0) throw NSErrors.InvalidRequest;
};

const execCommand = async (cmd, args) => {
    const pathToTheme = path.join(global.appRoot, 'themes', global?.envConfig?.environment?.currentTheme, '/');
    const res         = await packageManager.execSh(cmd, args, pathToTheme);
    return res;
};

module.exports = {
    getLogsContent,
    getNextVersion,
    changeNextVersion
};
