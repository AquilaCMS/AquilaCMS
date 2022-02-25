const path  = require('path');
const fs    = require('./fsp');
const utils = require('./utils');

let loadedModules = '';

const checkModule = async (aqlModule) => {
    const isValid = await utils.checkModuleRegistryKey(aqlModule.name);
    if (!isValid) {
        throw new Error('Error checking licence');
    }
    aqlModule.valid = true;
    return aqlModule;
};

const fetchModules = async () => {
    const Modules  = require('../orm/models/modules');
    const _modules = await Modules.find({active: true}, {name: 1, _id: 0}).lean();
    loadedModules  = [..._modules].map((lmod) => ({...lmod, valid: false}));
    console.log('Required modules :');
    for (let i = 0; i < loadedModules.length; i++) {
        console.log(`- ${loadedModules[i].name}`);
        const infoFile = path.join(global.appRoot, `/modules/${loadedModules[i].name}/info.json`);
        if (fs.existsSync(infoFile)) {
            loadedModules[i] = {...loadedModules[i], ...require(infoFile)};
            loadedModules[i] = await checkModule(loadedModules[i]);
            if (loadedModules[i].info.init.steps.length === 0) {
                delete loadedModules[i];
                console.log(`There is no init step for ${loadedModules[i].name}`);
            }
        } else {
            delete loadedModules[i];
            console.log(`There is no info file for ${loadedModules[i].name}`);
        }
    }
};

const moduleInitSteps = async (step = -1, params = {}) => {
    if (!loadedModules) fetchModules();
    if (loadedModules.length > 0) {
        process.stdout.write(`\x1b[32m Module Init : Step ${step} \x1b[0m\n`);
        for (let i = 0; i < loadedModules.length; i++) {
            if (!loadedModules[i].info.init.steps[step]) {
                console.log(`Module ${loadedModules[i].name} has no step ${step}`);
            } else {
                await runStepFile(loadedModules[i], step, params);
            }
        }
    } else {
        console.log('No modules to load');
    }
};

const runStepFile = async (aqlModule, step, params) => {
    try {
        const initStepFile = path.join(global.appRoot, `/modules/${aqlModule.name}/init/${aqlModule.info.init.steps[step]}`);
        if (fs.existsSync(initStepFile)) {
            require(initStepFile)(params);
        } else {
            console.error(`File ${aqlModule.info.init.steps[step]} is not present`);
        }
    } catch (err) {
        process.stdout.write('\x1b[31m \u274C An error has occurred \x1b[0m\n');
        console.error(err);
    }
};

module.exports = {
    moduleInitSteps
};