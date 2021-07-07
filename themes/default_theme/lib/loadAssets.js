/*
 * Retourne un objet contenant toutes les traductions AQLRC + celles du thème fusionnées
 */

const { assets, mergeRecursive } = require('aqlrc');

const namespaces = ['account', 'addresses', 'cart', 'category', 'delivery', 'common', 'login', 'payment', 'product-card', 'product', 'resetpass', 'static', 'success'];

let langs = [];
try {
    langs = require('../dynamic_langs');
} catch(ee) {
    langs = [{code: 'en', defaultLanguage: true}];
    console.error('dynamic_langs is missing ! Rerun installer or manage language in backoffice.');
}
const theme_assets = {};
langs.map((l) => {
    theme_assets[l.code] = {};
    for (const ns in namespaces) {
        try {
            theme_assets[l.code][namespaces[ns]] = require(`assets/i18n/${l.code}/${namespaces[ns]}.json`);
            // eslint-disable-next-line no-empty
        } catch (e) { }
    }
});

module.exports = { assets: mergeRecursive(assets, theme_assets), namespaces };
