const path           = require('path');
const fs             = require('../utils/fsp');
const packageManager = require('../utils/packageManager');
const NSErrors       = require('../utils/errors/NSErrors');

const setFilesInAquila = async (name) => {
    const filePath = path.resolve(global.appRoot, name);
    if (!await fs.access(filePath)) {
        await fs.writeFile(filePath, '');
    }
};

const getFileContent = async (name) => {
    const filePath = path.resolve(global.appRoot, name);
    if (await fs.access(filePath)) {
        let fileContent = '';
        let firstLines;
        try {
            fileContent = await fs.readFile(filePath, 'utf8');
            if (fileContent) {
                const allLines = fileContent.split('\n');
                for (let count = 0; count < 500; count++) {
                    if (allLines[count]) {
                        firstLines = `${firstLines}\n${allLines[count]}`;
                    }
                }
            } else {
                firstLines = 'None';
            }
            return {fileData: firstLines};
        } catch (err) {
            return {fileData: 'None'};
        }
    }
    return {fileData: 'None'};
};

const getNextVersionService = async () => {
    const datas = {};
    if (await fs.access(path.join(global.appRoot, 'yarn.lock'))) {
        const result = await packageManager.execSh('yarn', ['info', 'next', 'versions', '--json'], global.appRoot);
        let data     = result.stdout.split('}\n{');
        data         = data[data.length - 1];
        if (!data.startsWith('{')) {
            data = `{${data}`;
        }
        let currentVersion = await packageManager.execSh('yarn', ['list', '--pattern', 'next', '--json'], global.appRoot);
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
        const nextInstalledVersion = await packageManager.execSh('npm', ['ls', 'next', '--json'], global.appRoot);
        const listNextVersion      = await packageManager.execSh('npm', ['view', 'next', '--json'], global.appRoot);
        datas.actual               = JSON.parse(nextInstalledVersion.stdout).dependencies.next.version;
        datas.versions             = JSON.parse(listNextVersion.stdout).versions;
    }
    return datas;
};

const changeNextVersionService = async (body) => {
    const {nextVersion} = body;
    if (!nextVersion) throw NSErrors.UnprocessableEntity;
    let result;
    if (await fs.access(path.join(global.appRoot, 'yarn.lock'))) {
        result = await packageManager.execSh('yarn', ['add', `next@${nextVersion}`], global.appRoot);
    } else {
        result = await packageManager.execSh('npm', ['install', `next@${nextVersion}`], global.appRoot);
    }
    if (result.code !== 0) throw NSErrors.InvalidRequest;
};

module.exports = {
    getFileContent,
    setFilesInAquila,
    getNextVersionService,
    changeNextVersionService
};
