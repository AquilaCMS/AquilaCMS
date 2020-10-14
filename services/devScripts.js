const path       = require('path');
const mongoose   = require('mongoose');
const fs         = require('../utils/fsp');
const {Products} = require('../orm/models');

const createModelData = async () => {
    const schemas     = [];
    const themeFolder = path.join(global.appRoot, `themes/${global.envConfig.environment.currentTheme}`);
    for (const modelName of mongoose.modelNames()) {
        const model = await mongoose.model(modelName).find({}, '-__v');
        if (['configuration', 'modules', 'BundleProduct', 'SimpleProduct'].indexOf(modelName) === -1) {
            schemas.push({collection: modelName, datas: model});
        }
    }
    const exist = await !fs.access(path.join(themeFolder, '/demoDatas/'));
    if (!exist) {
        await fs.ensureDir(path.join(themeFolder, '/demoDatas/'));
    }
    const noCopy = ['users', 'configurations'];
    for (const data in schemas) {
        if (!noCopy.includes(schemas[data].collection) && schemas[data].datas.length !== 0) {
            const json = JSON.stringify(schemas[data], null, 2);
            await fs.writeFile(path.join(themeFolder, `/demoDatas/${schemas[data].collection}.json`), json, 'utf8');
        }
    }

    const photoPath = path.join(global.appRoot, require('../utils/server').getUploadDirectory());
    if (!await fs.access(path.join(global.appRoot, `${photoPath}`), fs.constants.R_OK)) {
        // eslint-disable-next-line no-useless-catch
        try {
            if (!fs.existsSync(photoPath)) {
                await fs.mkdir(photoPath);
            }
            if (!await fs.access(photoPath, fs.constants.R_OK)) {
                throw new Error(`"${photoPath}" is not readable`);
            }
        } catch (err) {
            throw err;
        }
    }

    if (!await fs.access(photoPath, fs.constants.W_OK)) {
        throw new Error(`"${photoPath}" is not writable`);
    }

    await fs.copyRecursiveSync(
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