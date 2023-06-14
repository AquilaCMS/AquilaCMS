import { useMemo }        from 'react';
import { configureStore } from '@reduxjs/toolkit';

let store;

const initialState = {
    // Common
    siteConfig         : {},
    urlsLanguages      : [],
    // Product
    product            : {},
    // Products
    products           : { datas: [], count: 0 },
    categoryProducts   : { datas: [], count: 0 },
    // Categories
    categoryBodyRequest: {},
    categoryPriceEnd   : { min: 0, max: 9999999 },
    // Statics
    staticPage         : {},
    // BlockCMS
    cmsBlocks          : [],
    // Navigation
    navMenu            : {},
    footerMenu         : {},
    // Cart
    cart               : {},
    // Orders
    orders             : { datas: [], count: 0 },
    // Other
    selectPage         : 1,
    showCartSidebar    : false,
    componentData      : {},
    cookieNotice       : null,
    aqModules          : null,
};

// TODO : https://openclassrooms.com/fr/courses/5511091-organisez-votre-application-avec-la-logique-redux/5880761-appelez-les-actions-dans-les-reducers
const rootReducer = (state = initialState, action) => {
    switch (action.type) {
    // Common
    case 'SET_SITECONFIG':
        return {
            ...state,
            siteConfig: action.data || initialState.siteConfig
        };
    case 'SET_URLS_LANGUAGES':
        return {
            ...state,
            urlsLanguages: action.data || initialState.urlsLanguages
        };
    // Product
    case 'SET_PRODUCT':
        return {
            ...state,
            product: action.data || initialState.product
        };
    // Products
    case 'SET_CATEGORY_PRODUCTS':
        return {
            ...state,
            categoryProducts: action.data || initialState.categoryProducts
        };
    // Categories
    case 'SET_CATEGORY_BODY_REQUEST':
        return {
            ...state,
            categoryBodyRequest: action.data || initialState.categoryBodyRequest
        };
    case 'SET_CATEGORY_PRICE_END':
        return {
            ...state,
            categoryPriceEnd: action.data || initialState.categoryPriceEnd
        };
    // Statics
    case 'SET_STATICPAGE':
        return {
            ...state,
            staticPage: action.data || initialState.staticPage
        };
    // BlockCMS
    case 'PUSH_CMSBLOCKS':
        return {
            ...state,
            cmsBlocks: [...state.cmsBlocks, ...action.data]// passer une array en data
        };
    // Navigation
    case 'SET_NAVMENU':
        return {
            ...state,
            navMenu: action.data || initialState.navMenu
        };
    case 'SET_FOOTER_MENU':
        return {
            ...state,
            footerMenu: action.data || initialState.footerMenu
        };
    // Cart
    case 'SET_CART':
        return {
            ...state,
            cart: action.data || initialState.cart
        };
    // Orders
    case 'SET_ORDERS':
        return {
            ...state,
            orders: action.data || initialState.orders
        };
    // Other
    case 'SET_SELECT_PAGE':
        return {
            ...state,
            selectPage: action.data || initialState.selectPage
        };
    case 'SET_SHOW_CART_SIDEBAR':
        return {
            ...state,
            showCartSidebar: action.value || initialState.showCartSidebar
        };
    case 'SET_COMPONENT_DATA':
        return {
            ...state,
            componentData: { ...state.componentData, ...action.data }
        };
    case 'SET_COOKIE_NOTICE':
        return {
            ...state,
            cookieNotice: action.data || initialState.cookieNotice
        };
    case 'SET_AQMODULES':
        return {
            ...state,
            aqModules: { ...state.aqModules, ...action.data }
        };
    // Default
    default:
        return state;
    }
};

function initStore(preloadedState = initialState) {
    return configureStore(
        { reducer: rootReducer, preloadedState }
    );
}

export const initializeStore = (preloadedState) => {
    let _store = store ?? initStore(preloadedState);

    // After navigating to a page with an initial Redux state, merge that state
    // with the current state in the store, and create a new store
    if (preloadedState && store) {
        _store = initStore({
            ...store.getState(),
            ...preloadedState,
        });
        // Reset the current store
        store = undefined;
    }

    // For SSG and SSR always create a new store
    if (typeof window === 'undefined') return _store;
    // Create the store once in the client
    if (!store) store = _store;

    return _store;
};

export function useStore(initialState) {
    const store = useMemo(() => initializeStore(initialState), [initialState]);
    return store;
}
