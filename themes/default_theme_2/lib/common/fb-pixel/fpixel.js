export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

export const pageview = (url) => {
    if (FB_PIXEL_ID) {
        if (url.startsWith('/checkout/')) {
            if (url.startsWith('/checkout/cart')) {
                window.fbq('track', 'cart');
            } else if (url.startsWith('/checkout/confirmation')) {
                window.fbq('track', 'payment');
            } else {
                window.fbq('track', 'order');
            }
        } else if (url.startsWith('/account')) {
            window.fbq('track', 'account');
        } else if (url.startsWith('/c/') || url.match(/^\/([^/]*)\/([^/]*)/)) {
            window.fbq('track', 'pageView');
        } else {
            window.fbq('track', 'content');
        }
    }
};

// https://developers.facebook.com/docs/facebook-pixel/advanced/
export const event = (name, options = {}) => {
    if (FB_PIXEL_ID) {
        window.fbq('track', name, options);
    }
};




// How to use :

// import * as fbq from '@lib/fpixel'
// const clickOnPurchase = () => {
//     fbq.event('Purchase', { currency: 'USD', value: 10 })
// }