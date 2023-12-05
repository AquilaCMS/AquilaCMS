import { getMenu }      from '@aquilacms/aquila-connector/api/menu';
import { getSiteInfo }  from '@aquilacms/aquila-connector/api/site';
import { getBlocksCMS } from '@aquilacms/aquila-connector/api/blockcms';
import { getCart }      from '@aquilacms/aquila-connector/api/cart';


// Set default actions, to be called in all pages via dispatcher
// Goal : No need to dispatch "global-datas" in every pages :)
export default function defaultActions(cookiesServerInstance, lang) {
    const array = [
        {
            type: 'SET_NAVMENU',
            func: getMenu.bind(this, 'menu-header', lang, 3)
        }, {
            type: 'SET_FOOTER_MENU',
            func: getMenu.bind(this, 'menu-footer', lang, 3)
        }, {
            type: 'SET_SITECONFIG',
            func: getSiteInfo.bind(this, lang)
        }, {
            type: 'PUSH_CMSBLOCKS',
            func: getBlocksCMS.bind(this, ['head', 'top-banner'], lang)
        }
    ];

    if (cookiesServerInstance) {
        const cartId = cookiesServerInstance.get('cart_id');
        if (cartId) {
            array.push({
                type: 'SET_CART',
                func: getCart.bind(this, cartId, {}, lang)
            });
        }

        const cookieNotice = cookiesServerInstance.get('cookie_notice');
        if (cookieNotice) {
            array.push({
                type : 'SET_COOKIE_NOTICE',
                value: cookieNotice
            });
        }
    }
    return array;
}
