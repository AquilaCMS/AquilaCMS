const i18next = require('i18next');
const moment = require('moment');
const XHR = require('i18next-http-backend');
const langs = require('../../config/dynamic_langs');
const loadAssets = require('./lib/loadAssets');

const options = {
    interpolation : {
        // React already does escaping
        escapeValue : false
    },
    fallbackLng : ['en'],
    languages   : Object.keys(loadAssets.assets),
    preload     : Object.keys(loadAssets.assets),
    load        : 'all',
    debug       : false,
    ns          : loadAssets.namespaces,
    react       : {
        wait : true
    }
};

const i18nInstance = i18next;

// for browser use xhr backend to load translations on client side
if (process.browser) {
    i18nInstance
        .use(XHR);
}

if (!i18nInstance.isInitialized) i18nInstance.init(options);

if (module.hot) {
    /* module.hot.accept('./assets/i18n/index.js', () => {
        const res = require('./assets/i18n/index.js');
        Object
            .keys(res)
            .forEach((lang) => {
                Object
                    .keys(res[lang])
                    .forEach((namespace) => {
                        i18nInstance.addResourceBundle(lang, namespace, res[lang][namespace], true, true);
                    });
            });
        i18nInstance.emit('loaded');
    }); */
    // Ajout des traductions AQLRC + thème fusionnées avec overwrite
    for (const l in loadAssets.assets) {
        for (const ns in loadAssets.assets[l]) {
            i18nInstance.default.addResourceBundle(l, ns, loadAssets.assets[l][ns], true, true);
        }
    }
}

// i18nInstance.on()

// a simple helper to getInitialProps passed on loaded i18n data
const getInitialProps =  (req, namespaces) => {
    let url = req.url;
    if (url.indexOf('?') > -1) {
        url = url.substr(0, url.indexOf('?'));
    }
    if ((url && url.indexOf('.') > -1) || (url && url.indexOf('admin') > -1)) {
        req.res.end();
    } else if (url) {
        console.log('\x1b[33m', '[NEXTJS] Render: ', url);
    }
    if (!namespaces) namespaces = i18nInstance.options.defaultNS;
    if (typeof namespaces === 'string') namespaces = [namespaces];
    namespaces = namespaces.concat(['common']);
    req.i18n.toJSON = () => null; // do not serialize i18next instance and send to client

    let lang = langs.find((element) => element.defaultLanguage === true).code;
    const regex = new RegExp(`^/(${Object.keys(loadAssets.assets).join('|')})/?`, 'i');
    const selLang = req.path.match(regex);
    if (selLang) {
        lang = selLang[1];
    }

    req.i18n.language = lang;
    moment.locale(lang);

    const initialI18nStore = {};
    const l = req.i18n.language;
    initialI18nStore[l] = {};
    namespaces.forEach((ns) => {
        initialI18nStore[l][ns] = (req.i18n.services.resourceStore.data[l] || {})[ns] || {};
    });

    i18nInstance.on('languageChanged', (lng) => {
        moment.locale(lng);
        console.log('i18n', lng);
    });

    // Ajout des traductions AQLRC + thème fusionnées avec overwrite
    for (const l in loadAssets.assets) {
        for (const ns in loadAssets.assets[l]) {
            req.i18n.addResourceBundle(l, ns, loadAssets.assets[l][ns], true, true);
        }
    }

    return {
        i18n            : req.i18n, // use the instance on req - fixed language on request (avoid issues in race conditions with lngs of different users)
        initialI18nStore,
        initialLanguage : req.i18n.language,
        prefix          : req.i18n.language !== 'en' ? `/${req.i18n.language}` : ''
    };
};

module.exports = {
    getInitialProps,
    i18nInstance,
    I18n : i18next.default,
    ns   : options.ns
};
