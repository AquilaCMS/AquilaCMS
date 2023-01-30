/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const moment   = require('moment-business-days');
const path     = require('path');
const {fs}     = require('aql-utils');
const utils    = require('../utils/utils');
const NSErrors = require('../utils/errors/NSErrors');

const getBreadcrumb = async (url) => {
    if (!url) {
        throw NSErrors.BadRequest;
    }

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

    const defaultLanguage = await Languages.findOne({defaultLanguage: true}, 'code').lean();
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

    // Static page
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
        parts = await parseUrlPrdCat(parts, url, keepL, lang);
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
            const result = await News.findOne({[`translation.${lang}.slug`]: url[0]}).lean();
            if (result !== null) {
                parts.push({
                    text   : result.translation[lang].title,
                    link   : url.slice(0, 1).join('/'),
                    isHome : false
                });
            }
        }
    } else if (url.includes('search') && url.length > 1) { // Search
        parts.push({
            text   : 'Recherche',
            link   : keepL,
            isHome : false
        });
    } else if (!url.includes('c') && url.length > 1) { // Product
        parts = await parseUrlPrdCat(parts, url, keepL, lang);
    }
    return parts;
};

const exportData = async (model, PostBody, noCSV = false) => {
    const server = require('../utils/server');

    moment.locale(global.aquila.defaultLang);
    const models = ['users', 'products', 'orders', 'contacts', 'bills'];
    if (models.includes(model)) {
        PostBody           = !PostBody || PostBody === {}   ? {} : PostBody;
        PostBody.filter    = !PostBody.filter               ? {} : PostBody.filter;
        PostBody.populate  = !PostBody.populate             ? [] : PostBody.populate;
        PostBody.sort      = !PostBody.sort                 ? {} : PostBody.sort;
        PostBody.structure = !PostBody.structure            ? [] : PostBody.structure;

        const {filter, populate, sort, structure} = PostBody;
        if (model === 'users') {
            structure.push('-password');
            structure.push('-resetPassToken');
        } else if (model === 'products') {
            structure.push('-reviews');
        }
        const datas     = await require('mongoose').model(model).find(filter, structure).sort(sort).populate(populate).lean();
        const csvFields = datas.length > 0 ? Object.keys(datas[0]) : ['Aucune donnee'];

        if (noCSV) return {datas, csvFields};
        const uploadDirectory = server.getUploadDirectory();
        if (!fs.existsSync(path.resolve(uploadDirectory, 'temp'))) {
            fs.mkdirSync(path.resolve(uploadDirectory, 'temp'));
        }

        const date   = Date.now();
        const result = await utils.json2csv(datas, csvFields, './exports', `export_${model}_${moment().format('YYYYMMDD')}.csv`);
        fs.writeFile(path.resolve(uploadDirectory, 'temp', `${date}.csv`), `\ufeff${result.csv}`, {encoding: 'utf8'});
        result.url = date;
        return result;
    }
};

const parseUrlPrdCat = async (parts, url, keepL, lang) => {
    for (let j = 0; j < url.length; j++) {
        const categoriesServices = require('./categories');
        const result             = await categoriesServices.getCategory({
            filter : {[`translation.${lang}.slug`]: url[j]}
        }, null, lang);
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