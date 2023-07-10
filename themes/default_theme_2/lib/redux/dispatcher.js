import { cookies }     from 'next/headers';
import { getCart }     from '@aquilacms/aquila-connector/api/cart';
import { getMenu }     from '@aquilacms/aquila-connector/api/menu';
import { getSiteInfo } from '@aquilacms/aquila-connector/api/site';

// Dispatch default actions and requested actions (for the current page)
// Goal : No need to dispatch "global action" in every pages :)
export const defaultDispatch = async (store, lang) => {
    // Get site infos
    const siteInfo = await getSiteInfo(lang);
    store.dispatch({ type: 'SET_SITECONFIG', data: siteInfo });

    // Get Menu
    const menuHeader = await getMenu('menu-header', lang, 3);
    store.dispatch({ type: 'SET_NAVMENU', data: menuHeader });

    // Get Cart
    const cartId = cookies().get('cart_id')?.value;
    if (cartId) {
        const cart = await getCart(cartId, {}, lang);
        store.dispatch({ type: 'SET_CART', data: cart });
    }
};
