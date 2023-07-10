'use server';

import { cookies }        from 'next/headers';
import { base64ToString } from '@lib/utils';

// Get server cookie (serverside)
export const getServerCookie = (name) => {
    return cookies().get(name);
};

// Set server cookie (serverside)
export const setServerCookie = async (name, value, options = {}) => {
    cookies().set(name, value, options);
};

// Unset server cookie (serverside)
export const unsetServerCookie = (name) => {
    const array = Array.isArray(name) ? name : [name];
    for (const i in array) {
        cookies().set(name[i]);
    }
};

export const getBodyRequestProductsFromCookie = () => {
    const cookieBody = base64ToString(getServerCookie('bodyRequestProducts')); // "parse" function use already decodeURIComponent (see https://github.com/jshttp/cookie)
    let body         = {};
    if (cookieBody) {
        try {
            body = JSON.parse(cookieBody);
        } catch (err) {
            unsetServerCookie('bodyRequestProducts');
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