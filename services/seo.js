/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                 = require('path');
const js2xmlparser         = require('js2xmlparser');
const moment               = require('moment');
const {fs}                 = require('aql-utils');
const NSErrors             = require('../utils/errors/NSErrors');
const {getUploadDirectory} = require('../utils/server');
const {
    Languages,
    Statics,
    Categories,
    Products,
    News
}                   = require('../orm/models');

let inCrawl       = false;
const sitemapConf = {
    home     : {frequency: 'daily', priority: '1.0'},
    product  : {frequency: 'weekly', priority: '0.5'},
    category : {frequency: 'daily', priority: '0.8'},
    blog     : {frequency: 'weekly', priority: '0.4'},
    other    : {frequency: 'weekly', priority: '0.2'}
};

const genSitemap = async () => {
    // Check that we are not in "demoMode"
    if (await isDemoMode()) {
        throw NSErrors.NoCronDemoMode;
    }

    await manageRobotsTxt(true);

    if (inCrawl === false) {
        console.log(`\x1b[5m\x1b[33m ${new Date()} Start of the sitemap generation\x1b[0m`);
        inCrawl = true;

        try {
            const appUrl     = global.aquila.envConfig.environment.appUrl;
            const languages  = await Languages.find({status: 'visible'}).lean();
            const _languages = {};
            for (let i = 0, leni = languages.length; i < leni; i++) {
                _languages[languages[i].code] = languages[i];
            }

            const sitemap = {
                '@' : {
                    xmlns         : 'http://www.sitemaps.org/schemas/sitemap/0.9',
                    'xmlns:xhtml' : 'https://www.w3.org/2002/08/xhtml/xhtml1-strict.xsd'
                },
                url : []
            };

            const statics = await Statics.find({active: true}).lean();

            // Loop static page
            for (let i = 0, leni = statics.length; i < leni; i++) {
                let page = 'other';
                if (statics[i].code === 'home') {
                    page = 'home';
                }

                // Loop languages
                // const _langs = Object.keys(statics[i].translation);
                for (let j = 0, lenj = languages.length; j < lenj; j++) {
                    const _static = statics[i].translation[languages[j].code];
                    const lang    = _languages[languages[j].code];
                    if (_static && _static.slug) {
                        const xhtml = [];
                        const url   = {
                            loc        : appUrl + (lang && lang.defaultLanguage === false ? `${lang.code}/` : '') + (page === 'home' ? '' : _static.slug),
                            lastmod    : moment().format('YYYY-MM-DD'),
                            changefreq : sitemapConf[page].frequency,
                            priority   : sitemapConf[page].priority
                        };
                        if (languages.length > 1) {
                            for (let k = 0, lenk = languages.length; k < lenk; k++) {
                                if (languages[k] && statics[i] && statics[i].translation[languages[k].code] && statics[i].translation[languages[k].code].slug) {
                                    const link = `${appUrl}${_languages && _languages[languages[k].code].defaultLanguage === false ? `${languages[k].code}/` : ''}${page === 'home' ? '' : statics[i].translation[languages[k].code].slug}`;
                                    xhtml.push({
                                        '@' : {
                                            rel      : 'alternate',
                                            hreflang : `${languages[k].code}`,
                                            href     : link
                                        }
                                    });
                                }
                            }
                            url['xhtml:link'] = xhtml;
                        }
                        sitemap.url.push(url);
                    }
                }
            }

            const categories = await Categories.find({active: true, action: 'catalog'}).lean();

            for (let i = 0, leni = categories.length; i < leni; i++) {
                for (let j = 0, lenj = languages.length; j < lenj; j++) {
                    const _category = categories[i].translation[languages[j].code];
                    const lang      = _languages[languages[j].code];

                    if (_category !== undefined && _category.slug) {
                        const xhtml = [];
                        const url   = {
                            loc        : appUrl + (lang && lang.defaultLanguage === false ? `${lang.code}/c/` : 'c/') + _category.slug,
                            lastmod    : moment().format('YYYY-MM-DD'),
                            changefreq : sitemapConf.category.frequency,
                            priority   : sitemapConf.category.priority
                        };
                        if (languages.length > 1) {
                            for (let k = 0, lenk = languages.length; k < lenk; k++) {
                                if (categories[i].translation[languages[k].code] !== undefined && categories[i].translation[languages[k].code].slug !== undefined) {
                                    const link = `${appUrl}${_languages && _languages[languages[k].code].defaultLanguage === false ? `${languages[k].code}/c/` : 'c/'}${categories[i].translation[languages[k].code].slug}`;
                                    xhtml.push({
                                        '@' : {
                                            rel      : 'alternate',
                                            hreflang : `${languages[k].code}`,
                                            href     : link
                                        }
                                    });
                                }
                            }
                            url['xhtml:link'] = xhtml;
                        }
                        sitemap.url.push(url);
                    }
                }
            }

            const products = await Products.find({active: true, _visible: true}).lean();

            for (let i = 0, leni = products.length; i < leni; i++) {
                for (let j = 0, lenj = languages.length; j < lenj; j++) {
                    const _product = products[i].translation[languages[j].code];

                    if (_product !== undefined && _product.canonical) {
                        const xhtml        = [];
                        _product.canonical = _product.canonical[0] === '/' ? _product.canonical.slice(1) : _product.canonical;
                        const url          = {
                            loc        : appUrl + _product.canonical,
                            lastmod    : moment().format('YYYY-MM-DD'),
                            changefreq : sitemapConf.product.frequency,
                            priority   : sitemapConf.product.priority
                        };
                        if (languages.length > 1) {
                            for (let k = 0, lenk = languages.length; k < lenk; k++) {
                                let canonical = '';
                                if (products[i].translation[languages[k].code] !== undefined && products[i].translation[languages[k].code].canonical !== undefined) {
                                    canonical  = products[i].translation[languages[k].code].canonical[0] === '/' ? products[i].translation[languages[k].code].canonical.slice(1) : products[i].translation[languages[k].code].canonical;
                                    const link = `${appUrl}${canonical}`;
                                    xhtml.push({
                                        '@' : {
                                            rel      : 'alternate',
                                            hreflang : `${languages[k].code}`,
                                            href     : link
                                        }
                                    });
                                }
                            }
                            url['xhtml:link'] = xhtml;
                        }
                        sitemap.url.push(url);
                    }
                }
            }

            const articles = await News.find({isVisible: true}).lean();

            for (let i = 0, leni = articles.length; i < leni; i++) {
                for (let j = 0, lenj = languages.length; j < lenj; j++) {
                    if (articles[i].translation[languages[j].code] !== undefined) {
                        const _article = articles[i].translation[languages[j].code];
                        const lang     = _languages[languages[j].code];
                        if (_article.slug) {
                            const xhtml = [];
                            const url   = {
                                loc        : `${appUrl + (lang && lang.defaultLanguage === false ? `${lang.code}/` : '')}blog/${_article.slug}`,
                                lastmod    : moment().format('YYYY-MM-DD'),
                                changefreq : sitemapConf.blog.frequency,
                                priority   : sitemapConf.blog.priority
                            };
                            if (languages.length > 1) {
                                for (let k = 0, lenk = languages.length; k < lenk; k++) {
                                    if (articles[i].translation[languages[k].code] !== undefined) {
                                        const link = `${appUrl}${_languages && _languages[languages[k].code].defaultLanguage === false ? `${languages[k].code}/` : ''}blog/${articles[i].translation[languages[k].code].slug}`;
                                        xhtml.push({
                                            '@' : {
                                                rel      : 'alternate',
                                                hreflang : `${languages[k].code}`,
                                                href     : link
                                            }
                                        });
                                    }
                                }
                                url['xhtml:link'] = xhtml;
                            }
                            sitemap.url.push(url);
                        }
                    }
                }
            }

            const sitemapString = js2xmlparser.parse('urlset', sitemap, {declaration: {version: '1.0', encoding: 'utf-8', standalone: 'yes'}});
            const sitemapPath   = path.resolve(getUploadDirectory(), 'sitemap.xml');
            await fs.writeFile(sitemapPath, sitemapString);
            inCrawl = false;
            console.log(`\x1b[5m\x1b[32m ${new Date()} End of the sitemap generation\x1b[0m`);
        } catch (err) {
            inCrawl = false;
            throw err;
        }
    } else {
        throw NSErrors.SitemapInUse;
    }
};

/*
* Remove sitemap.xml
*/
const removeSitemap = async () => {
    const filePath = path.join( getUploadDirectory(), 'sitemap.xml');
    if (await fs.hasAccess(filePath)) {
        await fs.unlink(filePath);
    }
};

/*
* Allow / Disallow seo in robots.txt
*/
const manageRobotsTxt = async (allow = true) => {
    const filePath  = path.join(global.aquila.appRoot, getUploadDirectory(), 'robots.txt');
    let contentFile = 'User-agent: *\nAllow: /';

    if (!allow) {
        contentFile = 'User-agent: *\nDisallow: /';
    }

    await fs.writeFile(filePath, contentFile);
};

/*
* Return true if the site is in demoMode
*/
const isDemoMode = async () => global.aquila.envConfig.environment.demoMode;

module.exports = {
    genSitemap,
    removeSitemap,
    manageRobotsTxt,
    isDemoMode
};