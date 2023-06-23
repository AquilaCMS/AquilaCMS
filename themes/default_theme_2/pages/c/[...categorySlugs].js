import { useEffect, useState }                              from 'react';
import absoluteUrl                                          from 'next-absolute-url';
import Head                                                 from 'next/head';
import { useRouter }                                        from 'next/router';
import getT                                                 from 'next-translate/getT';
import useTranslation                                       from 'next-translate/useTranslation';
import parse                                                from 'html-react-parser';
import Cookies                                              from 'cookies';
import PageError                                            from '@pages/_error';
import Filters                                              from '@components/category/Filters';
import Pagination                                           from '@components/category/Pagination';
import Layout                                               from '@components/layouts/Layout';
import NextSeoCustom                                        from '@components/tools/NextSeoCustom';
import Breadcrumb                                           from '@components/navigation/Breadcrumb';
import CategoryList                                         from '@components/category/CategoryList';
import ProductList                                          from '@components/product/ProductList';
import MenuCategories                                       from '@components/navigation/MenuCategories';
import { dispatcher }                                       from '@lib/redux/dispatcher';
import { getBreadcrumb }                                    from '@aquilacms/aquila-connector/api/breadcrumb';
import { getCategory, getCategoryProducts }                 from '@aquilacms/aquila-connector/api/category';
import { getSiteInfo }                                      from '@aquilacms/aquila-connector/api/site';
import { useCategoryProducts, useAqModules, useSiteConfig } from '@lib/hooks';
import {
    initAxios, 
    serverRedirect, 
    stringToBase64, 
    getBodyRequestProductsFromCookie, 
    convertFilter, 
    filterPriceFix, 
    moduleHook, 
    isAllAqModulesInitialised 
} from '@lib/utils';

export async function getServerSideProps({ defaultLocale, locale, params, query, req, res, resolvedUrl }) {
    initAxios(locale, req, res);

    const categorySlugs = Array.isArray(params.categorySlugs) ? params.categorySlugs : [params.categorySlugs];
    const t             = await getT(locale, 'common');
    
    // Get category from slug
    let categories = [];
    for (let slug of categorySlugs) {
        try {
            const cat = await getCategory(locale, { PostBody: { filter: { [`translation.${locale}.slug`]: slug } } });
            if (cat) {
                categories.push(cat);
            } else {
                return { notFound: true };
            }
        } catch (err) {
            return { notFound: true };
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
    const siteInfo     = await getSiteInfo(locale);
    if (siteInfo.themeConfig?.values?.find(t => t.key === 'infiniteScroll')) {
        infiniteScroll = siteInfo.themeConfig?.values?.find(t => t.key === 'infiniteScroll')?.value;
    }

    // Get cookie server instance
    const cookiesServerInstance = new Cookies(req, res);

    // Validity key for body request cookie
    const key = `${category._id}-${locale}`;

    // Get body request from cookie
    const bodyRequestProducts = getBodyRequestProductsFromCookie(cookiesServerInstance);

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
        filterRequest = convertFilter(bodyRequestProducts.filter, locale);
    }

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
        productsData = await getCategoryProducts('', category._id, locale, { PostBody: { filter: filterRequest, page: pageRequest, limit: limitRequest, sort: sortRequest } });
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
        }, {
            type : 'SET_URLS_LANGUAGES',
            value: urlsLanguages
        }
    ];

    const pageProps = await dispatcher(locale, req, res, actions);

    // Get breadcrumb
    let breadcrumb = [];
    try {
        breadcrumb = await getBreadcrumb(`${defaultLocale !== locale ? `/${locale}` : ''}${resolvedUrl}`);
    } catch (err) {
        console.error(err.message || t('common:message.unknownError'));
    }

    // URL origin
    const { origin } = absoluteUrl(req);
    
    pageProps.props.origin     = origin;
    pageProps.props.breadcrumb = breadcrumb;
    pageProps.props.category   = category;
    pageProps.props.limit      = defaultLimit;
    return pageProps;
}

export default function Category({ breadcrumb, category, limit, origin, error }) {
    const [message, setMessage]        = useState();
    const { aqModules }                = useAqModules();
    const { categoryProducts }         = useCategoryProducts();
    const { environment, themeConfig } = useSiteConfig();
    const router                       = useRouter();
    const { lang, t }                  = useTranslation();

    useEffect(() => {
        // Event when all Aquila modules ("global" type) are initialised
        if (isAllAqModulesInitialised(aqModules)) {
            const addTransaction = new CustomEvent('viewItemList', { detail: { category, products: categoryProducts.datas } });
            window.dispatchEvent(addTransaction);
        }
    }, [aqModules]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY) {
                localStorage.setItem('scroll', window.scrollY);
            }
        };
        handleScroll();
        if (category.children.length) {
            localStorage.removeItem('scroll');
        } else {
            window.addEventListener('scroll', handleScroll);
        }

        const positionTop = localStorage.getItem('scroll');
        if (positionTop) {
            window.scrollTo(0, positionTop);
        }

        return () => window.removeEventListener('scroll', handleScroll);
    }, [router.asPath]);

    const getProductsList = async (postBody) => {
        setMessage();
        try {
            const products = await getCategoryProducts('', category._id, lang, postBody);
            return products;
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
            throw new Error('Error getProductsList');
        }
    };

    let queryPage = Number(router.query.page);
    if (!queryPage) {
        queryPage = 1;
    }
    const pageCount = Math.ceil(categoryProducts.count / limit);

    if (error) {
        return <PageError statusCode={error.code} />;
    }

    let [url] = router.asPath.split('?');
    if (router.defaultLocale !== lang) {
        url = `/${lang}${url}`;
    }
    
    return (
        <Layout>
            <NextSeoCustom
                title={`${environment?.siteName} - ${category.name}`}
                description={category.metaDescription}
                canonical={`${origin}${url}${queryPage > 1 ? `?page=${queryPage}` : ''}`}
                lang={lang}
                image={`${origin}/images/medias/max-100/605363104b9ac91f54fcabac/Logo.jpg`}
            />

            <Head>
                {
                    queryPage > 1 && <link rel="prev" href={`${origin}${url}${queryPage === 2 ? '' : `?page=${queryPage - 1}`}`} />
                }
                {
                    (queryPage >= 1) && queryPage < pageCount && <link rel="next" href={`${origin}${url}?page=${queryPage + 1}`} />
                }
            </Head>

            <div>{parse(category.extraText || '')}</div>

            {
                moduleHook('category-top')
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
                                    moduleHook('category-top-list')
                                }
                            </div>
                            <div className="container-col">
                                <MenuCategories />

                                <div className="tabs w-tabs">
                                    <div id="tabs_content" className="tabs-content w-tab-content">
                                        {
                                            themeConfig?.values?.find(v => v.key === 'filters')?.value === 'top' && (
                                                <div className="div-block-allergenes">
                                                    <Filters filtersData={category.filters} getProductsList={getProductsList} />
                                                </div>
                                            )
                                        }
                                        
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
                    )
                }
                
                <div className="container w-container">
                    <p className="paragraph-seo">{parse(category.extraText3 || '')}</p>
                </div>
            </div>
        </Layout>
    );
}
