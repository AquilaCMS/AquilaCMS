const {Products} = require('../orm/models');
const servicesLanguages = require('./languages');

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

/**
 * @description Fix les canonical (vide)
 */
const fixCanonical = async (product_id) => {
    const languages = await servicesLanguages.getLanguages({filter: {status: 'visible'}, limit: 100});
    const tabLang   = languages.datas.map((_lang) => _lang.code);

    const productsList = await Products.find(typeof product_id !== 'undefined' ? {_id: product_id} : {});
    // Liste des produits
    for (const oneProduct of productsList) {
        // Control par langue
        for (let iLang = 0; iLang < tabLang.length; iLang++) {
            const currentLang = tabLang[iLang];

            if (oneProduct.translation && oneProduct.translation[currentLang] && oneProduct.translation[currentLang].slug) {
                oneProduct.translation[currentLang].canonical = `/other/${oneProduct.translation[currentLang].slug}`;
                await oneProduct.save();
            }
        }
        // End control par langue
    }
    // End liste des produits
};

module.exports = {
    sortAttribs,
    fixCanonical
};