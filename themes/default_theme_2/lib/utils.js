import React                                       from 'react';
import Cookies                                     from 'cookies';
import cookie                                      from 'cookie';
import crypto                                      from 'crypto';
import jwt_decode                                  from 'jwt-decode';
import { aqlRound }                                from 'aql-utils/theme';
import { getBlockCMS, getBlocksCMS }               from '@aquilacms/aquila-connector/api/blockcms';
import { getBlogList }                             from '@aquilacms/aquila-connector/api/blog';
import { getCategory, getCategoryProducts }        from '@aquilacms/aquila-connector/api/category';
import { getComponent }                            from '@aquilacms/aquila-connector/api/component';
import { getProduct, getProductById, getProducts } from '@aquilacms/aquila-connector/api/product';
import { getUser }                                 from '@aquilacms/aquila-connector/api/user';
import  axios                                      from '@aquilacms/aquila-connector/lib/AxiosInstance';

export const deepMergeObjects = (target, source) => {
    // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) Object.assign(source[key], deepMergeObjects(target[key], source[key]));
    }
  
    // Join `target` and modified `source`
    Object.assign(target || {}, source);
    return target;
};

// Returns true if it's a mobile device
export const isMobile = () => {
    if (typeof window !== 'undefined' && navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i)) {
        return true;
    } else {
        return false;
    }
};

// Returns an object for redirects in getServerSideProps
export const serverRedirect = (url, permanent = false) => {
    return {
        redirect: {
            permanent,
            destination: url
        }
    };
};

// Get user ID from JWT
export const getUserIdFromJwt = (cookies) => {
    const jwt = cookie.parse(cookies).jwt;
    if (!jwt) return null;
    const user = jwt_decode(jwt);
    if (!user) return null;
    return user.userId;
};

// Return client data or false
// Protect next pages requiring authentication
export const authProtectedPage = async (cookies) => {
    if (!cookies) {
        return false;
    }
    const idUser = getUserIdFromJwt(cookies);
    if (!idUser) {
        return false;
    }
    try {
        const data = await getUser(idUser);
        if (!data) {
            return false;
        }
        return data;
    } catch (err) {
        console.error(err);
        return false;
    }
};

// Set token Axios
export const setTokenAxios = (jwt) => {
    if (jwt) {
        axios.defaults.headers.common['Authorization'] = jwt;
    } else {
        delete axios.defaults.headers.common['Authorization'];
    }
};

// Set lang & token Axios
export const initAxios = (lang, req, res) => {
    const cookiesServerInstance = new Cookies(req, res);
    cookiesServerInstance.set('lang', lang, { path: '/', httpOnly: false });
    axios.defaults.headers.common['lang'] = lang;

    const jwt = cookiesServerInstance.get('jwt');
    setTokenAxios(jwt);
};

// Unset cookie (serverside/clientside)
export const unsetCookie = (name, cookiesServerInstance = undefined) => {
    if (Array.isArray(name)) {
        for (const n in name) {
            if (cookiesServerInstance) {
                cookiesServerInstance.set(name[n]);
            } else {
                document.cookie = name[n] + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            }
        }
    } else {
        if (cookiesServerInstance) {
            cookiesServerInstance.set(name);
        } else {
            document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
    }
};

export const simplifyPath = (path) => {
    return path.split('?')[0].split('/');
};

export const cloneObj = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

// Capitalize first letter of string
export const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

// String to base64
export const stringToBase64 = (str) => {
    if (!str) return '';
    return Buffer.from(str).toString('base64');
};

// Base64 to string
export const base64ToString = (str) => {
    if (!str) return '';
    return Buffer.from(str, 'base64').toString('utf8');
};

// Format date
export const formatDate = (date, lang = 'fr', options = { year: 'numeric', month: 'numeric', day: 'numeric' }) => {
    let timestamp = Date.parse(date);
    let d         = new Date(timestamp).toLocaleDateString(lang, options);
    return d.toString().charAt(0).toUpperCase() + d.toString().slice(1);
};

// Format time
export const formatTime = (time, lang = 'fr', options = { hour: '2-digit', minute: '2-digit' }) => {
    let timestamp = Date.parse(time);
    let d         = new Date(timestamp).toLocaleTimeString(lang, options);
    return d.toString();
};

// Format price (with thousands separator + €)
export const formatPrice = (price) => {
    const n       = aqlRound(price, 2);
    const array   = n.toString().split('.');
    const integer = Number(array[0]).toLocaleString(); // Adding thousands separator
    const decimal = array[1] ? `.${array[1]}` : '';
    return `${integer}${decimal} €`;
};

// Format order status (color)
export const formatOrderStatus = (code, t) => {
    switch (code) {
    case 'ASK_CANCEL':
    case 'CANCELED':
    case 'PAYMENT_CONFIRMATION_PENDING':
    case 'PAYMENT_RECEIPT_PENDING':
    case 'PAYMENT_PENDING':
    case 'PAYMENT_FAILED':
    case 'PROCESSED':
    case 'PROCESSING':
        return <span style={{ color: 'red' }}>{t(`pages/account/index:status.${code}`)}</span>;
    case 'FINISHED':
    case 'BILLED':
    case 'PAID':
    case 'DELIVERY_PROGRESS':
    case 'DELIVERY_PARTIAL_PROGRESS':
    case 'RETURNED':
        return <span style={{ color: 'green' }}>{t(`pages/account/index:status.${code}`)}</span>;
    default:
        return t('pages/account/index:status.DEFAULT');
    }
};

// Format stock
export const formatStock = (stock) => {
    if (!stock) {
        return '';
    }
    let color = 'red';
    if (!stock.orderable || stock.status === 'epu') {
        color = 'red';
    } else if (stock.status === 'dif') {
        color = 'orange';
    } else if (stock.status === 'liv') {
        color = 'green';
    }
    return <span style={{ fontWeight: 'bold', color }}>{stock.value?.replace('{date}', stock.date_supply ? formatDate(stock.date_supply) : '?')}</span>;
};

// Get availability from stock for JSon-LD
export const getAvailability = (stock) => {
    if (!stock) {
        return '';
    }
    let status = 'OutOfStock';
    if (stock.status === 'liv') {
        status = 'InStock';
    } else if (stock.status === 'dif') {
        status = 'PreOrder';
    } else if (stock.status === 'epu') {
        status = 'OutOfStock';
    }
    return status;
};

// Getting body request from cookie (serverside/clientside)
export const getBodyRequestProductsFromCookie = (cookiesServerInstance) => {
    let cookieBody = '';
    if (cookiesServerInstance) {
        cookieBody = base64ToString(cookiesServerInstance.get('bodyRequestProducts'));
    } else {
        cookieBody = base64ToString(cookie.parse(document.cookie).bodyRequestProducts); // "parse" function use already decodeURIComponent (see https://github.com/jshttp/cookie)
    }
    let body = {};
    if (cookieBody) {
        try {
            body = JSON.parse(cookieBody);
        } catch (err) {
            unsetCookie('bodyRequestProducts', cookiesServerInstance);
        }
    }

    // Check validity price filter
    if (body.filter?.price) {
        if (!body.filter.price.min || !body.filter.price.max || body.filter.price.min > body.filter.price.max) {
            delete body.filter.price;
        }
    }

    // Check validity sort
    if (body.sort && !body.sort.match(/^[.a-z]+\|-?1$/i)) {
        delete body.sort;
    }
    
    return body;
};

// Convert filter of body request cookie to postbody filter
export const convertFilter = (filter, lang) => {
    if (!filter || !Object.entries(filter).length) {
        return {};
    }

    const rawFilter = cloneObj(filter);
    let newFilter   = { $and: [] };

    // Search filter management
    if (rawFilter.search) {
        newFilter.$text = { $search: rawFilter.search };
        delete rawFilter.search;
    }

    // Price filter management
    if (rawFilter.price) {
        newFilter.$and.push({ 'price.priceSort.ati': { $gte: rawFilter.price.min, $lte: rawFilter.price.max } });
        delete rawFilter.price;
    }

    // Attributes filter management
    if (rawFilter.attributes) {
        for (const [attributeId, values] of Object.entries(rawFilter.attributes)) {
            newFilter.$and.push({ attributes: { $elemMatch: { [`translation.${lang}.value`]: { $in: values }, id: attributeId } } });
        }
        delete rawFilter.attributes;
    }

    // Pictos filter management
    if (rawFilter.pictos) {
        newFilter.$and.push({ pictos: { $elemMatch: { code: { $in: rawFilter.pictos } } } });
        delete rawFilter.pictos;
    }

    // Others filters
    for (const [type, obj] of Object.entries(rawFilter)) {
        if (Array.isArray(obj)) {
            newFilter.$and = [...newFilter.$and, ...obj];
        } else {
            newFilter.$and.push(obj);
        }
    }
    if (!newFilter.$and.length) {
        delete newFilter.$and;
    }
    return newFilter;
};

// Detecting bad price data cookie
// If there is a price filter selected and the min and max values are outside the limits
export const filterPriceFix = (bodyRequestProducts, priceEnd) => {
    if (bodyRequestProducts.filter?.price) {
        if (bodyRequestProducts.filter.price.min < priceEnd.min) {
            bodyRequestProducts.filter.price.min = priceEnd.min;
        }
        if (bodyRequestProducts.filter.price.max > priceEnd.max) {
            bodyRequestProducts.filter.price.max = priceEnd.max;
        }
        if (bodyRequestProducts.filter.price.min === priceEnd.min && bodyRequestProducts.filter.price.max === priceEnd.max) {
            delete bodyRequestProducts.filter.price;
            if (!Object.keys(bodyRequestProducts.filter).length) {
                delete bodyRequestProducts.filter;
            }
        }
    }
};

// Check if all products are virtual
export const isAllVirtualProducts = (items) => {
    return items.filter((item) => !item.typeDisplay).every((item) => item.type.startsWith('virtual'));
};

// Load components data in CMS block or statics pages
export const nsComponentDataLoader = async (html, lang, data = {}) => {
    let nsComponentData = { ...data };

    // Remove all HTML comments
    html = html.replace(/<!--[\s\S]*?-->/gm, '');

    // Searching all <ns-[...]>
    const nsComponents = html.match(/(<ns-[^<]*?>)/gm);
    if (!nsComponents) return nsComponentData;

    for (let i = 0; i < nsComponents.length; i++) {
        const attributes = {};
        let match;
        let tag          = '';
        match            = nsComponents[i].match(/<(ns-[a-zA-Z0-9-]*)([^>]*)>/);
        if (match) {
            tag        = match[1];
            const attr = match[2];

            // Get attributes
            if (attr) {
                match = attr.match(/[^\t\r\n\s=]+(="[^"]+")?/g);
                match.forEach((a) => {
                    const attribute  = a.match(/([^\t\r\n\s=]+)(="([^"]+)")?/);
                    const name       = attribute[1];
                    const val        = attribute[3];
                    attributes[name] = val;
                });
            }
        }
        if (tag === 'ns-blog-articles') {
            // Get data of blog
            try {
                const postBody                = {
                    filter: {
                        [`translation.${lang}`]: { $exists: true }
                    },
                    sort : '-createdAt',
                    page : 1,
                    limit: 99
                };
                const blogList                = await getBlogList(postBody, lang);
                nsComponentData['nsBlogList'] = blogList;
            } catch (err) {
                console.error(err);
            }
        } else if (tag === 'ns-cms') {
            // Get data of CMS block
            if (!attributes['ns-code']) {
                continue;
            }

            // If data has already been recovered
            if (nsComponentData[`nsCms_${attributes['ns-code']}`]) {
                continue;
            }

            try {
                const cmsBlock = await getBlockCMS(attributes['ns-code'], lang);
                if (!cmsBlock) {
                    continue;
                }
                nsComponentData[`nsCms_${attributes['ns-code']}`] = cmsBlock;

                // Recursivity
                if (cmsBlock.content) {
                    nsComponentData = await nsComponentDataLoader(cmsBlock.content, lang, nsComponentData);
                }
            } catch (err) {
                console.error(err);
            }
            
        } else if (tag === 'ns-block-slider') {
            // Get data of CMS blockslider
            if (!attributes['ns-code']) {
                continue;
            }

            let codes  = attributes['ns-code'].replace(/\s/g, '').split(',');
            const hash = crypto.createHash('md5').update(codes.join('_')).digest('hex');

            // If data has already been recovered
            if (nsComponentData[`nsBlockSlider_${hash}`]) {
                continue;
            }

            try {
                const cms       = [];
                const cmsBlocks = await getBlocksCMS(codes, lang);
                for (let j = 0; j < cmsBlocks.length; j++) {
                    cms.push(cmsBlocks[j]);

                    // Recursivity
                    if (cmsBlocks[j].content) {
                        nsComponentData = await nsComponentDataLoader(cmsBlocks[j].content, lang, nsComponentData);
                    }
                }
                nsComponentData[`nsBlockSlider_${hash}`] = cms;
            } catch (err) {
                console.error(err);
            }
        } else if (tag === 'ns-product-card') {
            // Get data of product card :
            // - type="id" 
            // - type="code"
            if (!attributes.type) {
                continue;
            }
            if (!attributes.value) {
                continue;
            }

            // If data has already been recovered
            if (nsComponentData[`nsProductCard_${attributes.type}_${attributes.value}`]) {
                continue;
            }
            
            let product;
            try {
                if (attributes.type === 'id') {
                    product = await getProductById(attributes.value, lang);
                } else if (attributes.type === 'code') {
                    const postBody = {
                        PostBody: {
                            filter: { code: attributes.value }
                        }
                    };
                    product        = await getProduct(postBody, false, lang);
                }

                if (!product) {
                    continue;
                }

                nsComponentData[`nsProductCard_${attributes.type}_${attributes.value}`] = product;
            } catch (err) {
                console.error(err);
            }
        } else if (tag === 'ns-product-card-list') {
            // Get data of product card list :
            // - type="category" (code)
            // - type="new"
            // - type="product_id"
            // - type="product_code"
            // - type="list_id"
            // - type="list_code"
            if (!attributes.type) {
                continue;
            }
            if (!attributes.value && attributes.type !== 'new') {
                continue;
            }
            const hash = crypto.createHash('md5').update(`${attributes.type}_${attributes.value}`).digest('hex');
            if (nsComponentData[`nsProductList_${hash}`]) {
                continue;
            }

            const filter = {};
            let response = {};
            if (attributes.type === 'category') {
                const postbody = {
                    lang,
                    PostBody: {
                        filter: { code: attributes.value }
                    }
                };
                try {
                    const category = await getCategory(lang, postbody);
                    if (!category._id) {
                        continue;
                    }
                
                    response = await getCategoryProducts('', category._id, lang);
                } catch(err) {
                    console.error(err);
                }
            } else {
                if (attributes.type === 'new') {
                    filter.is_new = true;
                } else if (attributes.type === 'product_id') {
                    filter._id = attributes.value;
                } else if (attributes.type === 'product_code') {
                    filter.code = attributes.value;
                } else if (attributes.type === 'list_id') {
                    filter._id = { $in: attributes.value.split(',').map((v) => v.trim()) };
                } else if (attributes.type === 'list_code') {
                    filter.code = { $in: attributes.value.split(',').map((v) => v.trim()) };
                } else {
                    continue;
                }
                const postbody = { PostBody: { filter } };
                try {
                    response = await getProducts(false, postbody, lang);
                } catch(err) {
                    console.error(err);
                }
            }
            nsComponentData[`nsProductList_${hash}`] = response.datas;
        } else if (tag === 'ns-gallery' || tag === 'ns-slider') {
            // Get data of gallery or slider
            try {
                const component         = await getComponent(tag, attributes['ns-code'], lang);
                const array             = tag.split('-');
                const newTag            = `${array[0] + capitalizeFirstLetter(array[1])}_${attributes['ns-code']}`;
                nsComponentData[newTag] = component;
            } catch (err) {
                console.error(err);
            }
        }
    }
    return nsComponentData;
};

export const getAqModules = () => {
    try {
        const nsModules = require('modules/list_modules');
        return nsModules.default;
    } catch (err) {
        return null;
    }
};

export const moduleHook = (type, props = {}) => {
    const nsModules = getAqModules();
    const modules   = nsModules?.filter((m) => m.type === type);
    if (!modules || !modules.length) return null;
    for (let index in modules) {
        const Comp = modules[index].jsx.default;
        if (Comp) {
            return <Comp key={index + modules[index].code} {...props} />;
        } else {
            return null;
        }
    }
};

export const isAllAqModulesInitialised = (aqModules) => {
    if (!aqModules) return false;

    // If modules object has no key, return true
    if (!Object.keys(aqModules).length) {
        return true;
    }

    for (let key in aqModules) {
        if (!aqModules[key]) {
            return false;
        }
    }
    return true;
};
export class ConnectorError extends Error {
    constructor(code, message = '') {
        super(message);
        this.name = 'ConnectorError';
        this.code = code;
    }
}