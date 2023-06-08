const path  = require('path');
const {fs}  = require('aql-utils');
const utils = require('./utils');

let loadedModules = '';

// Verification of the validity of each module
const checkModule = async (aqlModule) => {
    const isValid = await utils.checkModuleRegistryKey(aqlModule.name);
    if (!isValid) {
        throw new Error('Error checking licence');
    }
    aqlModule.valid = true;
    return aqlModule;
};

// Retrieve all modules from the database
const fetchModules = async () => {
    const Modules  = require('../orm/models/modules');
    const _modules = await Modules.find({active: true}, {name: 1, _id: 0}).lean();
    loadedModules  = [..._modules].map((lmod) => ({...lmod, valid: false}));
    console.log('Required modules :');
    for (let i = 0; i < loadedModules.length; i++) {
        console.log(`- ${loadedModules[i].name}`);
        const infoFile = path.join(global.aquila.appRoot, `/modules/${loadedModules[i].name}/info.json`);
        if (fs.existsSync(infoFile)) {
            loadedModules[i] = {...loadedModules[i], ...require(infoFile)};
            loadedModules[i] = await checkModule(loadedModules[i]);
        } else {
            delete loadedModules[i];
            console.log(`There is no info file for ${loadedModules[i].name}`); // TODO : to be replaced by package.json when yarn workspaces will be merged
        }
    }
};

// Module init steps management (with old way compatibility)
const moduleInitSteps = async (step = -1, params = {}) => {
    if (!loadedModules) await fetchModules();
    if (loadedModules.length > 0) {
        process.stdout.write(`\x1b[32mModule Init : Step ${step} \x1b[0m\n`);
        for (let i = 0; i < loadedModules.length; i++) {
            const moduleStep = step - 1;
            if (loadedModules[i].info?.init?.steps) { // The new way with the steps
                if (!loadedModules[i].info.init.steps[moduleStep]) {
                    console.log(`Module ${loadedModules[i].name} has no step ${step}`);
                } else {
                    const filePath = path.join(global.aquila.appRoot, `/modules/${loadedModules[i].name}/init/${loadedModules[i].info.init.steps[moduleStep]}`);
                    await runStepFile(loadedModules[i], filePath, params);
                }
            } else {
                // ------- The old way with init.js and initAfter.js
                if (step === 1) { // init.js
                    const filePath = path.join(global.aquila.appRoot, `/modules/${loadedModules[i].name}/init.js`);
                    await runStepFile(loadedModules[i], filePath, params);
                } else if (step === 4) { // initAfter.js
                    await new Promise(async (resolve, reject) => {
                        try {
                            const filePath = path.join(global.aquila.appRoot, `/modules/${loadedModules[i].name}/initAfter.js`);
                            if (fs.existsSync(filePath)) {
                                require(filePath)(resolve, reject, params.server, params.apiRouter, params.passport);
                            } else {
                                console.error(`File ${filePath} is not present`);
                            }
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    });
                }
                // ------- Delete the above code when all modules are up to date
            }
        }
    }
};

// Run a file
const runStepFile = async (aqlModule, filePath, params) => {
    try {
        if (fs.existsSync(filePath)) {
            require(filePath)(params);
        } else {
            console.error(`File ${filePath} is not present`);
        }
    } catch (err) {
        process.stdout.write('\x1b[31m \u274C An error has occurred \x1b[0m\n');
        console.error(err);
    }
};

module.exports = {
    moduleInitSteps
};