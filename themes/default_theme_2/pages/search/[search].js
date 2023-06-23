import { useEffect, useState }                              from 'react';
import useTranslation                                       from 'next-translate/useTranslation';
import Cookies                                              from 'cookies';
import PageError                                            from '@pages/_error';
import Filters                                              from '@components/category/Filters';
import Pagination                                           from '@components/category/Pagination';
import Layout                                               from '@components/layouts/Layout';
import NextSeoCustom                                        from '@components/tools/NextSeoCustom';
import ProductList                                          from '@components/product/ProductList';
import { dispatcher }                                       from '@lib/redux/dispatcher';
import { getProducts }                                      from '@aquilacms/aquila-connector/api/product';
import { getSiteInfo }                                      from '@aquilacms/aquila-connector/api/site';
import { useAqModules, useCategoryProducts, useSiteConfig } from '@lib/hooks';
import { 
    initAxios, 
    serverRedirect, 
    stringToBase64, 
    getBodyRequestProductsFromCookie, 
    convertFilter, 
    filterPriceFix,
    isAllAqModulesInitialised
} from '@lib/utils';

export async function getServerSideProps({ locale, params, query, req, res, resolvedUrl }) {
    initAxios(locale, req, res);

    const search = params.search.trim() || '';

    // Min 2 caracters
    if (search.length < 2) {
        return serverRedirect('/');
    }

    // Enable / Disable infinite scroll
    let infiniteScroll = false;
    const siteInfo     = await getSiteInfo(locale);
    if (siteInfo.themeConfig?.values?.find(t => t.key === 'infiniteScroll')) {
        infiniteScroll = siteInfo.themeConfig?.values?.find(t => t.key === 'infiniteScroll')?.value;
    }

    // Get cookie server instance
    const cookiesServerInstance = new Cookies(req, res);

    // Get body request from cookie
    const bodyRequestProducts = getBodyRequestProductsFromCookie(cookiesServerInstance);

    // Validity key for body request cookie
    const key = `search-${search}-${locale}`;

    // If validity key is different (=> change search), we remove filter & page
    if (bodyRequestProducts.key !== key) {
        if (bodyRequestProducts.filter) {
            delete bodyRequestProducts.filter;
        }
        if (bodyRequestProducts.page) {
            delete bodyRequestProducts.page;
        }
    }

    // Body request : filter
    if (!bodyRequestProducts.filter) {
        bodyRequestProducts.filter = {};
    }
    bodyRequestProducts.filter.search = search;
    const filterRequest               = convertFilter(bodyRequestProducts.filter, locale);

    // Body request : page (from GET param or cookie)
    // Important : the "page" cookie is used to remember the page when you consult a product and want to go back,
    // we can't do it with Redux because it is reinitialized at each change of page unlike the cookie available on the server side.
    let page        = 1;
    let forcePage   = false;
    const queryPage = Number(query.page);
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
        defaultLimit = siteInfo.themeConfig?.values?.find(t => t.key === 'productsPerPage')?.value || 16;
    }
    let limitRequest = defaultLimit;

    // Body request : sort
    let sortRequest = { sortWeight: -1 };
    if (bodyRequestProducts.sort) {
        const [sortField, sortValue] = bodyRequestProducts.sort.split('|');
        sortRequest                  = { [sortField]: parseInt(sortValue) };
    }

    // If infinite scroll activated (infiniteScroll >= 1 & no force page) and pagination > 1
    // We load all products loaded via infinite scroll
    let pageRequest = page;
    if (infiniteScroll && !forcePage && page > 1) {
        pageRequest  = 1;
        limitRequest = page * limitRequest;
    }

    // Using keywords search & locale (lang) for validity key of body request cookie 
    bodyRequestProducts.key = key;
    
    // Get products
    let productsData = {};
    let priceEnd     = { min: 0, max: 0 };
    try {
        productsData = await getProducts(true, { PostBody: { filter: filterRequest, page: pageRequest, limit: limitRequest, sort: sortRequest } }, locale);
    } catch (err) {
        return { notFound: true };
    }

    if (!productsData.datas.length && pageRequest > 1) {
        delete bodyRequestProducts.page;

        // Set body request cookie
        cookiesServerInstance.set('bodyRequestProducts', stringToBase64(JSON.stringify(bodyRequestProducts)), { path: '/', httpOnly: false, maxAge: 43200000 });

        // Redirect to first page
        return serverRedirect(resolvedUrl);
    }

    // Price end (min & max)
    priceEnd = {
        min: Math.floor(productsData.unfilteredPriceSortMin.ati),
        max: Math.ceil(productsData.unfilteredPriceSortMax.ati)
    };

    // If filter min or max price are outside of range, delete filter price
    if (bodyRequestProducts.filter?.price && (bodyRequestProducts.filter.price.min > priceEnd.max || bodyRequestProducts.filter.price.max < priceEnd.min)) {
        delete bodyRequestProducts.filter.price;
        if (!Object.keys(bodyRequestProducts.filter).length) {
            delete bodyRequestProducts.filter;
        }

        // Set body request cookie
        cookiesServerInstance.set('bodyRequestProducts', stringToBase64(JSON.stringify(bodyRequestProducts)), { path: '/', httpOnly: false, maxAge: 43200000 });

        // Redirect to first page
        return serverRedirect(resolvedUrl);
    }

    // Detecting bad price end in price filter of body request cookie
    filterPriceFix(bodyRequestProducts, priceEnd);

    // Set body request cookie
    cookiesServerInstance.set('bodyRequestProducts', stringToBase64(JSON.stringify(bodyRequestProducts)), { path: '/', httpOnly: false, maxAge: 43200000 });

    const actions = [
        {
            type : 'SET_CATEGORY_BODY_REQUEST',
            value: bodyRequestProducts
        }, {
            type : 'SET_CATEGORY_PRICE_END',
            value: priceEnd
        }, {
            type : 'SET_CATEGORY_PRODUCTS',
            value: productsData
        }
    ];

    const pageProps        = await dispatcher(locale, req, res, actions);
    pageProps.props.search = search;
    return pageProps;
}

export default function Search({ search, error }) {
    const [message, setMessage]        = useState();
    const { aqModules }                = useAqModules();
    const { categoryProducts }         = useCategoryProducts();
    const { environment, themeConfig } = useSiteConfig();
    const { lang, t }                  = useTranslation();

    useEffect(() => {
        // Event when all Aquila modules ("global" type) are initialised
        if (isAllAqModulesInitialised(aqModules)) {
            const addTransaction = new CustomEvent('search', { detail: { search } });
            window.dispatchEvent(addTransaction);
        }
    }, [aqModules, search]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY) {
                localStorage.setItem('scroll', window.scrollY);
            }
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll);

        const positionTop = localStorage.getItem('scroll');
        if (positionTop) {
            window.scrollTo(0, positionTop);
        }

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const getProductsList = async (postBody) => {
        setMessage();
        try {
            const products = await getProducts(true, postBody, lang);
            return products;
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
            throw new Error('Error getProductsList');
        }
    };

    if (error) {
        return <PageError statusCode={error.code} />;
    }
    
    return (
        <Layout>
            <NextSeoCustom
                noindex={true}
                title={`${environment?.siteName} - ${t('pages/search:title')}`}
            />

            <div className="content-section-carte">
                {
                    <>
                        <div className="container w-container">
                            {
                                //moduleHook('category-top-list', { limit })
                            }
                        </div>
                        <div className="container-col">
                            <div className="tabs w-tabs">
                                <div id="tabs_content" className="tabs-content w-tab-content">
                                    {
                                        themeConfig?.values?.find(v => v.key === 'filters')?.value === 'top' && (
                                            <div className="div-block-allergenes">
                                                <Filters filtersData={categoryProducts.filters} getProductsList={getProductsList} />
                                            </div>
                                        )
                                    }
                                    <h6 className="heading-6-center">{t('pages/search:results', { count: categoryProducts.count, search })}</h6>
                                    <Pagination getProductsList={getProductsList}>
                                        <ProductList type="data" value={categoryProducts.datas} />
                                    </Pagination>
                                    {
                                        message && (
                                            <div className={`w-commerce-commerce${message.type}`}>
                                                <div>
                                                    {message.message}
                                                </div>
                                            </div>
                                        )
                                    }
                                </div>
                            </div>
                        </div>
                    </>
                }
            </div>
        </Layout>
    );
}
