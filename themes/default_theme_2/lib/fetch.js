import { cookies } from 'next/headers';
import cookie      from 'cookie';

export const customFetch = async (section, method, data) => {
    const baseUrl     = process.env.NEXT_PUBLIC_BASE_URL;
    const isServer    = typeof window === 'undefined';
    let Authorization = undefined;
    let lang          = undefined;
    if (!isServer) {
        const token = cookie.parse(document.cookie).jwt;
        if (token) {
            Authorization = token;
        }
        lang = cookie.parse(document.cookie).lang || 'fr';
    } else {
        const token = cookies().get('jwt');
        if (token) {
            Authorization = token;
        }
        lang = cookies().get('lang') || 'fr';
    }
    const options = {
        baseUrl,
        customHeaders: {
            Authorization,
            lang
        }
    };

    const path            = `@aquilacms/aquila-connector/api/${section}`;
    const ApiCart         = (await import(path)).ApiCart;
    const apiCartInstance = new ApiCart(options);
    return apiCartInstance[method](...data);
};


/*export const customFetch = async (url, method) => {
    const baseUrl     = process.env.NEXT_PUBLIC_BASE_URL;
    const isServer    = typeof window === 'undefined';
    let Authorization = undefined;
    if (!isServer) {
        const token = cookie.parse(document.cookie).jwt;
        if (token) {
            Authorization = token;
        }
    } else {
        const { cookies } = (await import('next/headers'));
        const token       = cookies().get('jwt');
        if (token) {
            Authorization = token;
        }
    }

    if (method === 'GET') {
        const res = await fetch(baseUrl + url, {
            method : 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization
            }
        });
        return res.json();
    } else if (method === 'POST') {
        const res = await fetch(baseUrl + url, {
            method : 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization
            },
            body: JSON.stringify(data)
        });
        return res.json();
    } else if (method === 'PUT') {
        const res = await fetch(baseUrl + url, {
            method : 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization
            },
            body: JSON.stringify(data)
        });
        return res.json();
    } else if (method === 'DELETE') {
        const res = await fetch(baseUrl + url, {
            method : 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization
            }
        });
        return res.json();
    }
    const res = await fetch(baseUrl + url, options);
    
};*/