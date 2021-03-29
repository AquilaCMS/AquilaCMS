/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path     = require('path');
const mongoose = require('mongoose');
const fs       = require('../utils/fsp');
const {
    Products
}                = require('../orm/models');

const createModelData = async () => {
    const schemas     = [];
    const themeFolder = path.join(global.appRoot, `themes/${global.envConfig.environment.currentTheme}`);
    for (const modelName of mongoose.modelNames()) {
        const model = await mongoose.model(modelName).find({}, '-__v');
        if (['configuration', 'modules', 'BundleProduct', 'SimpleProduct'].indexOf(modelName) === -1) {
            schemas.push({collection: modelName, datas: model});
        }
    }
    await fs.mkdir(path.join(themeFolder, '/demoDatas/'), {recursive: true});
    const noCopy = ['users', 'configurations'];
    for (const data in schemas) {
        if (!noCopy.includes(schemas[data].collection) && schemas[data].datas.length !== 0) {
            const json = JSON.stringify(schemas[data], null, 2);
            await fs.writeFile(path.join(themeFolder, `/demoDatas/${schemas[data].collection}.json`), json, 'utf8');
        }
    }

    const photoPath = path.join(global.appRoot, require('../utils/server').getUploadDirectory());
    await fs.mkdir(photoPath, {recursive: true});
    if (!await fs.hasAccess(photoPath)) {
        throw new Error(`"${photoPath}" is not readable`);
    }

    if (!(await fs.hasAccess(photoPath, fs.constants.W_OK))) {
        throw new Error(`"${photoPath}" is not writable`);
    }

    await fs.copyRecursive(
        photoPath,
        path.join(themeFolder, '/demoDatas/files'),
        false,
        ['cache', 'temp']
    );
};

/**
 * @description Fix les incohérences des attributs pour les trier par ordre alphabetique
 */
const sortAttribs = async () => {
    try {
        console.log('==><== Début du tri des attributs par order alphabetique ==><==');

        const _products = await Products.find({});

        for (let i = 0, leni = _products.length; i < leni; i++) {
            // console.log(`${i}/${_products.length}`);
            // const attribs = _products[i].attributes;

            _products[i].attributes.sort(function (first, second) {
                if (first.code < second.code) {
                    return -1;
                }
                if (first.code > second.code) {
                    return 1;
                }
                return 0;
            });

            await _products[i].save();
            // await Products.updateOne({_id: _products[i]._id}, {attributes: attribs});
        }

        console.log('==><== Fin du tri ==><==');
        return {message: 'ok'};
    } catch (err) {
        console.log('==><== Erreur lors du tri ==><==');
        throw err;
    }
};

module.exports = {
    createModelData,
    sortAttribs
};