import { useState, useEffect }      from 'react';
import { useSelector, useDispatch } from 'react-redux';
import useTranslation               from 'next-translate/useTranslation';
import { getPaymentMethods }        from '@aquilacms/aquila-connector/api/payment';
import { getUser }                  from '@aquilacms/aquila-connector/api/user';
import { getUserIdFromJwt }         from '@lib/utils';

/**
 * GET / SET cart data (redux)
 * @returns { cart: {}, setCart: function }
 */
export const useCart = () => {
    const cart     = useSelector((state) => state.cart);
    const dispatch = useDispatch();
    const setCart  = (data) =>
        dispatch({
            type: 'SET_CART',
            data
        });

    return { cart, setCart };
};

// GET / SET selected page (redux)
export const useSelectPage = () => {
    const selectPage    = useSelector((state) => state.selectPage);
    const dispatch      = useDispatch();
    const setSelectPage = (data) =>
        dispatch({
            type: 'SET_SELECT_PAGE',
            data
        });

    return { selectPage, setSelectPage };
};

// GET / SET category body request (redux)
export const useCategoryBodyRequest = () => {
    const categoryBodyRequest    = useSelector((state) => state.categoryBodyRequest);
    const dispatch               = useDispatch();
    const setCategoryBodyRequest = (data) =>
        dispatch({
            type: 'SET_CATEGORY_BODY_REQUEST',
            data
        });

    return { categoryBodyRequest, setCategoryBodyRequest };
};

// GET / SET category price end (redux)
export const useCategoryPriceEnd = () => {
    const categoryPriceEnd    = useSelector((state) => state.categoryPriceEnd);
    const dispatch            = useDispatch();
    const setCategoryPriceEnd = (data) =>
        dispatch({
            type: 'SET_CATEGORY_PRICE_END',
            data
        });

    return { categoryPriceEnd, setCategoryPriceEnd };
};

// GET / SET category data products (redux)
export const useCategoryProducts = () => {
    const categoryProducts    = useSelector((state) => state.categoryProducts);
    const dispatch            = useDispatch();
    const setCategoryProducts = (data) =>
        dispatch({
            type: 'SET_CATEGORY_PRODUCTS',
            data
        });
    return { categoryProducts, setCategoryProducts };
};

// GET CMS blocks data (redux)
export const useCmsBlocks = () => {
    const cmsBlocks = useSelector((state) => state.cmsBlocks);
    return cmsBlocks;
};

// GET / SET cookie notice (redux)
export const useCookieNotice = () => {
    const cookieNotice    = useSelector((state) => state.cookieNotice);
    const dispatch        = useDispatch();
    const setCookieNotice = (data) =>
        dispatch({
            type: 'SET_COOKIE_NOTICE',
            data
        });
    return { cookieNotice, setCookieNotice };
};

// GET component data (redux)
export const useComponentData = () => {
    const componentData = useSelector((state) => state.componentData);
    return componentData;
};

// GET menu data (redux)
export const useNavMenu = () => {
    const navMenu = useSelector((state) => state.navMenu);
    return navMenu;
};

// GET footer menu data (redux)
export const useFooterMenu = () => {
    const footerMenu = useSelector((state) => state.footerMenu);
    return footerMenu;
};

// GET / SET product data (redux)
export const useProduct = () => {
    const product    = useSelector((state) => state.product);
    const dispatch   = useDispatch();
    const setProduct = (data) =>
        dispatch({
            type: 'SET_PRODUCT',
            data
        });
    return { product, setProduct };
};

// GET / SET show or hide bool for cart sidebar (redux)
export const useShowCartSidebar = () => {
    const showCartSidebar    = useSelector((state) => state.showCartSidebar);
    const dispatch           = useDispatch();
    const setShowCartSidebar = (value, cart = {}) => {
        if (value) {
            // Event
            const addTransaction = new CustomEvent('viewCart', { detail: { cart } });
            window.dispatchEvent(addTransaction);
        }
        return (
            dispatch({
                type: 'SET_SHOW_CART_SIDEBAR',
                value
            })
        );
    };
    return { showCartSidebar, setShowCartSidebar };
};

// GET / SET modules info (redux)
export const useAqModules = () => {
    const aqModules    = useSelector((state) => state.aqModules);
    const dispatch     = useDispatch();
    const setAqModules = (data) =>
        dispatch({
            type: 'SET_AQMODULES',
            data
        });
    return { aqModules, setAqModules };
};

// GET site infos (redux)
export const useSiteConfig = () => {
    const siteConfig = useSelector((state) => state.siteConfig);
    return siteConfig;
};

// GET URLs for language change (redux)
export const useUrlsLanguages = () => {
    const urlsLanguages = useSelector((state) => state.urlsLanguages);
    return urlsLanguages;
};

// GET payment methods
export const usePaymentMethods = () => {
    const [paymentMethods, setPaymentMethods] = useState([]);
    const { lang, t }                         = useTranslation();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getPaymentMethods(lang);
                setPaymentMethods(data);
            } catch (err) {
                console.error(err.message || t('common:message.unknownError'));
            }
        };
        fetchData();
    }, []);

    return paymentMethods;
};

// GET / SET orders (redux)
export const useOrders = () => {
    const orders    = useSelector((state) => state.orders);
    const dispatch  = useDispatch();
    const setOrders = (data) =>
        dispatch({
            type: 'SET_ORDERS',
            data
        });
    return { orders, setOrders };
};

// GET / SET static page (redux)
export const useStaticPage = () => {
    const staticPage    = useSelector((state) => state.staticPage);
    const dispatch      = useDispatch();
    const setStaticPage = (data) =>
        dispatch({
            type: 'SET_STATICPAGE',
            data
        });
    return { staticPage, setStaticPage };
};

// GET user from JWT
export const useUser = () => {
    const [user, setUser] = useState();
    const { t }           = useTranslation();

    useEffect(() => {
        const idUser    = getUserIdFromJwt(document.cookie);
        const fetchData = async () => {
            try {
                const data = await getUser(idUser);
                setUser(data);
            } catch (err) {
                console.error(err.message || t('common:message.unknownError'));
            }
        };
        if (idUser) {
            fetchData();
        }
    }, []);

    return user;
};