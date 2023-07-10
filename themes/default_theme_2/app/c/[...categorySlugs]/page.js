import { createStore }                                       from '@lib/redux/store';
import { defaultDispatch }                                   from '@lib/redux/dispatcher';
import ReduxProvider                                         from '@lib/redux/provider';
import { cookies, headers }                                  from 'next/headers';
import { redirect, notFound }                                from 'next/navigation';
import getT                                                  from 'next-translate/getT';
import useTranslation                                        from 'next-translate/useTranslation';
import parse                                                 from 'html-react-parser';
import CategoryBody                                          from '@components/category/CategoryBody';
import Layout                                                from '@components/layouts/Layout';
import NextSeoCustom                                         from '@components/tools/NextSeoCustom';
import Breadcrumb                                            from '@components/navigation/Breadcrumb';
import CategoryList                                          from '@components/category/CategoryList';
import MenuCategories                                        from '@components/navigation/MenuCategories';
import { getBreadcrumb }                                     from '@aquilacms/aquila-connector/api/breadcrumb';
import { getCategory, getCategoryProducts }                  from '@aquilacms/aquila-connector/api/category';
import { useAqModules }                                      from '@lib/hooks';
import { getServerCookie, getBodyRequestProductsFromCookie } from '@lib/serverCookies';
import {
    stringToBase64,
    convertFilter, 
    filterPriceFix, 
    //moduleHook, 
    isAllAqModulesInitialised 
} from '@lib/utils';

export default async function CategoryPage({ params, searchParams }) {
    const store    = createStore();
    const { lang } = useTranslation();

    // Redirect to first page
    const headersList = headers();
    // read the custom x-pathname header
    const pathname = headersList.get('x-pathname') || '';
    console.log('url', pathname);
    
    await defaultDispatch(store, lang);

    const categorySlugs = Array.isArray(params.categorySlugs) ? params.categorySlugs : [params.categorySlugs];
    const t             = await getT(lang, 'common');
    
    // Get category from slug
    let categories = [];
    for (let slug of categorySlugs) {
        try {
            const cat = await getCategory(lang, { PostBody: { filter: { [`translation.${lang}.slug`]: slug } } });
            if (cat) {
                categories.push(cat);
            } else {
                notFound();
            }
        } catch (err) {
            notFound();
        }
    }
    const category = categories.length ? categories[categories.length - 1] : {};

    // Get URLs for language change
    const slugsLangs    = {};
    const urlsLanguages = [];
    for (const c of categories) {
        for (const [lang, sl] of Object.entries(c.slug)) {
            if (!slugsLangs[lang]) {
                slugsLangs[lang] = [];
            }
            slugsLangs[lang].push(sl);
        }
    }
    for (const [lang, sl] of Object.entries(slugsLangs)) {
        urlsLanguages.push({ lang, url: `/c/${sl.join('/')}` });
    }

    // Enable / Disable infinite scroll
    let infiniteScroll = false;
    const siteConfig   = store.getState().siteConfig;
    if (siteConfig.themeConfig?.values?.find(t => t.key === 'infiniteScroll')) {
        infiniteScroll = siteConfig.themeConfig?.values?.find(t => t.key === 'infiniteScroll')?.value;
    }

    // Validity key for body request cookie
    const key = `${category._id}-${lang}`;

    // Get body request from cookie
    const bodyRequestProducts = getBodyRequestProductsFromCookie(true);

    // If validity key is different (=> change category), we remove filter & page
    if (bodyRequestProducts.key !== key) {
        if (bodyRequestProducts.filter) {
            if (bodyRequestProducts.filter.price) {
                delete bodyRequestProducts.filter.price;
            }
            if (bodyRequestProducts.filter.attributes) {
                delete bodyRequestProducts.filter.attributes;
            }
            if (bodyRequestProducts.filter.pictos) {
                delete bodyRequestProducts.filter.pictos;
            }
            if (bodyRequestProducts.filter.search) {
                delete bodyRequestProducts.filter.search;
            }
            if (!Object.keys(bodyRequestProducts.filter).length) {
                delete bodyRequestProducts.filter;
            }
        }

        if (bodyRequestProducts.page) {
            delete bodyRequestProducts.page;
        }
    }

    // Body request : filter
    let filterRequest = {};
    if (bodyRequestProducts.filter) {
        filterRequest = convertFilter(bodyRequestProducts.filter, lang);
    }

    // Body request : page (from GET param or cookie)
    // Important : the "page" cookie is used to remember the page when you consult a product and want to go back,
    // we can't do it with Redux because it is reinitialized at each change of page unlike the cookie available on the server side.
    let page        = 1;
    let forcePage   = false;
    const queryPage = Number(searchParams.page);
    // If GET "page" param exists, we take its value first
    if (queryPage) {
        page = queryPage;
        if (page > 1) {
            bodyRequestProducts.page = page;
        } else if (bodyRequestProducts.page) {
            delete bodyRequestProducts.page;
        }
        forcePage = true;
    } else if (bodyRequestProducts.page) {
        // We take the value in body request cookie
        page = bodyRequestProducts.page;
    }

    // Body request : limit (from cookie or theme config)
    let defaultLimit = 1;
    if (bodyRequestProducts.limit) {
        defaultLimit = bodyRequestProducts.limit;
    } else {
        defaultLimit = siteConfig.themeConfig?.values?.find(t => t.key === 'productsPerPage')?.value || 16;
    }
    let limitRequest = defaultLimit;

    // Body request : sort
    let sortRequest = { sortWeight: -1 };
    if (bodyRequestProducts.sort) {
        const [sortField, sortValue] = bodyRequestProducts.sort.split('|');
        sortRequest                  = { [sortField]: parseInt(sortValue) };
    }

    // Special process if infinite scroll activated (infiniteScroll >= 1 & no force page) and pagination > 1
    // We load all products loaded via infinite scroll
    let pageRequest = page;
    if (infiniteScroll && !forcePage && page > 1) {
        pageRequest  = 1;
        limitRequest = page * limitRequest;
    }

    // Using category ID & locale (lang) for validity key of body request cookie
    bodyRequestProducts.key = key;

    // Get products
    let productsData = {};
    let priceEnd     = { min: 0, max: 0 };
    try {
        productsData = await getCategoryProducts('', category._id, lang, { PostBody: { filter: filterRequest, page: pageRequest, limit: limitRequest, sort: sortRequest } });
    } catch (err) {
        notFound();
    }

    if (!productsData.datas.length && pageRequest > 1) {
        delete bodyRequestProducts.page;

        // Set body request cookie
        //setServerCookie('bodyRequestProducts', stringToBase64(JSON.stringify(bodyRequestProducts)), { path: '/', httpOnly: false, maxAge: 43200000 });

        redirect(pathname);
    }

    // Price end (min & max)
    if (productsData.unfilteredPriceSortMin) {
        priceEnd = {
            min: Math.floor(productsData.unfilteredPriceSortMin.ati),
            max: Math.ceil(productsData.unfilteredPriceSortMax.ati)
        };
    }

    // If filter min or max price are outside of range, delete filter price
    if (bodyRequestProducts.filter?.price && (bodyRequestProducts.filter.price.min > priceEnd.max || bodyRequestProducts.filter.price.max < priceEnd.min)) {
        delete bodyRequestProducts.filter.price;
        if (!Object.keys(bodyRequestProducts.filter).length) {
            delete bodyRequestProducts.filter;
        }

        // Set body request cookie
        //setServerCookie('bodyRequestProducts', stringToBase64(JSON.stringify(bodyRequestProducts)), { path: '/', httpOnly: false, maxAge: 43200000 });

        // Redirect to first page
        redirect(pathname);
    }

    // Detecting bad price end in price filter of body request cookie
    filterPriceFix(bodyRequestProducts, priceEnd);

    // Set body request cookie
    //setServerCookie('bodyRequestProducts', stringToBase64(JSON.stringify(bodyRequestProducts)), { path: '/', httpOnly: false, maxAge: 43200000 });

    // Set Redux store
    store.dispatch({
        type: 'SET_CATEGORY_BODY_REQUEST',
        data: bodyRequestProducts
    });
    store.dispatch({
        type: 'SET_CATEGORY_PRICE_END',
        data: priceEnd
    });
    store.dispatch({
        type: 'SET_CATEGORY_PRODUCTS',
        data: productsData
    });
    store.dispatch({
        type: 'SET_URLS_LANGUAGES',
        data: urlsLanguages
    });


    // Get breadcrumb
    let breadcrumb = [];
    try {
        breadcrumb = await getBreadcrumb(`${'fr' !== lang ? `/${lang}` : ''}${pathname}`);
    } catch (err) {
        console.error(err.message || t('common:message.unknownError'));
    }

    // URL origin
    const origin = headersList.get('host');

    return (
        <ReduxProvider preloadedState={store.getState()}>
            <Layout>

                <div>{parse(category.extraText || '')}</div>

                {
                    //moduleHook('category-top')
                }

                <Breadcrumb items={breadcrumb} origin={origin} />

                <div className="content-section-carte">
                    {
                        category.action !== 'catalog' ? (
                            <>
                                <div className="container w-container">
                                    <div className="paragraph-seo">{parse(category.extraText2 || '')}</div>
                                </div>
                                <div className="container-col">
                                    <div className="tabs w-tabs">
                                        <div id="tabs_content" className="tabs-content w-tab-content">
                                            <div className="tab-pane-wrap w-tab-pane w--tab-active">
                                                <div className="w-dyn-list">
                                                    <CategoryList categoryList={category.children} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="container w-container">
                                    <div className="paragraph-seo">{parse(category.extraText2 || '')}</div>
                                    {
                                        //moduleHook('category-top-list')
                                    }
                                </div>
                                <div className="container-col">
                                    <MenuCategories />

                                    <CategoryBody category={category} />
                                </div>
                            </>
                        )
                    }
                
                    <div className="container w-container">
                        <p className="paragraph-seo">{parse(category.extraText3 || '')}</p>
                    </div>
                </div>
            </Layout>
        </ReduxProvider>
    );
}