const moment = require('moment-business-days');
const utils  = require('../utils/utils');

const getBreadcrumb = async (url) => {
    const {Languages, News} = require('../orm/models');
    const languagesT        = await Languages.find({}, 'code').lean();
    const languages         = [];
    for (let i = 0; i < languagesT.length; i++) {
        languages.push(languagesT[i].code);
    }

    let keepL   = '/';
    const index = url.indexOf('');
    if (index > -1) {
        url.splice(index, 1);
    }

    const defaultLanguage = await Languages.findOne({defaultLanguage: true}, 'code');
    let lang              = '';
    if (defaultLanguage !== null) {
        lang = defaultLanguage.code;
    }

    if (languages.includes(url[0])) {
        lang  = url[0];
        keepL = `/${url[0]}/`;
        url.splice(0, 1);
    }

    let parts = [{
        text   : 'Accueil',
        link   : keepL,
        isHome : true
    }];

    // Page statique
    if (!url.includes('blog') && url.length === 1) {
        const staticsServices = require('./statics');
        const result          = await staticsServices.getStatic({filter: {[`translation.${lang}.slug`]: url[0]}});
        if (result !== null) {
            parts.push({
                text   : result.translation[lang].title,
                link   : `/${url.slice(0, 1).join('/')}`,
                isHome : false
            });
        }
    } else if (url.includes('c')) { // Catégorie
        const index = url.indexOf('c');
        if (index > -1) {
            url.splice(index, 1);
        }
        parts = parseUrlPrdCat(parts, url, keepL, lang);
    } else if (url.includes('blog')) { // Blog
        const index = url.indexOf('blog');
        if (index > -1) {
            url.splice(index, 1);
        }

        parts.push({
            text   : 'Blog',
            link   : `${keepL}blog`,
            isHome : false
        });

        if (url && url[0]) {
            const result = await News.findOne({[`translation.${lang}.slug`]: url[0]});
            if (result !== null) {
                parts.push({
                    text   : result.translation[lang].title,
                    link   : keepL + url.slice(0, 1).join('/'),
                    isHome : false
                });
            }
        }
    } else if (url.includes('search') && url.length > 1) { // Recherche
        parts.push({
            text   : 'Recherche',
            link   : keepL,
            isHome : false
        });
    } else if (!url.includes('c') && url.length > 1) { // Produit
        parts = parseUrlPrdCat(parts, url, keepL, lang);
    }
    return parts;
};

const exportData = async (model, PostBody) => {
    moment.locale(global.defaultLang);
    const models = ['users', 'products', 'orders'];
    if (models.includes(model)) {
        PostBody           = !PostBody || PostBody === {}   ? {} : PostBody;
        PostBody.filter    = !PostBody.filter               ? {} : PostBody.filter;
        PostBody.populate  = !PostBody.populate             ? [] : PostBody.populate;
        PostBody.sort      = !PostBody.sort                 ? {} : PostBody.sort;
        PostBody.structure = !PostBody.structure            ? [] : PostBody.structure;

        const {filter, populate, sort, structure} = PostBody;
        const addStructure                        = {};
        structure.forEach((struct) => addStructure[struct] = 1);
        const datas     = await require('mongoose').model(model).find(filter, addStructure).sort(sort).populate(populate).lean();
        const csvFields = datas.length > 0 ? Object.keys(datas[0]) : ['Aucune donnee'];

        return utils.json2csv(datas, csvFields, './exports', `export_${model}_${moment().format('YYYYMMDD')}.csv`);
    }
};

const parseUrlPrdCat = async (parts, url, keepL, lang) => {
    for (let j = 0; j < url.length; j++) {
        const categoriesServices = require('./categories');
        const result             = await categoriesServices.getCategory({filter: {[`translation.${lang}.slug`]: url[j]}}, null, lang);
        if (result !== null) {
            parts.push({
                text   : result.translation[lang].name,
                link   : `${keepL}c/${url.slice(0, j + 1).join('/')}`,
                isHome : false
            });
        } else {
            const productsServices = require('./products');
            const result           = await productsServices.getProduct({filter: {[`translation.${lang}.slug`]: url[j]}});
            if (result !== null) {
                parts.push({
                    text   : result.translation[lang].name,
                    link   : keepL + url.slice(0, j + 1).join('/'),
                    isHome : false
                });
            }
        }
    }
    return parts;
};

module.exports = {
    getBreadcrumb,
    exportData
};