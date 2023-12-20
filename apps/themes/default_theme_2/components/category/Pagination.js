import { useEffect, useState }                                                             from 'react';
import InfiniteScroll                                                                      from 'react-infinite-scroll-component';
import ReactPaginate                                                                       from 'react-paginate';
import { useRouter }                                                                       from 'next/router';
import useTranslation                                                                      from 'next-translate/useTranslation';
import Button                                                                              from '@components/ui/Button';
import { useCategoryPriceEnd, useCategoryBodyRequest, useCategoryProducts, useSiteConfig } from '@lib/hooks';
import { stringToBase64, getBodyRequestProductsFromCookie, convertFilter, filterPriceFix } from '@lib/utils';

export default function Pagination({ children, getProductsList }) {
    const [pageCount, setPageCount]                       = useState(0);
    const [isLoading, setIsLoading]                       = useState(false);
    const { categoryPriceEnd, setCategoryPriceEnd }       = useCategoryPriceEnd();
    const { categoryBodyRequest, setCategoryBodyRequest } = useCategoryBodyRequest();
    const { categoryProducts, setCategoryProducts }       = useCategoryProducts();
    const { themeConfig }                                 = useSiteConfig();
    const router                                          = useRouter();
    const { lang, t }                                     = useTranslation();

    // Force page
    let forcePage   = false;
    const queryPage = Number(router.query.page);
    if (queryPage) {
        forcePage = true;
    }

    // Getting Limit for request
    const defaultLimit = themeConfig?.values?.find(t => t.key === 'productsPerPage')?.value || 16;

    // Getting pagination mode (0=normal | 1=infinite scroll | 2=infinite scroll with button)
    const paginationMode = themeConfig?.values?.find(t => t.key === 'infiniteScroll')?.value || 0;

    // Getting URL page
    const [url] = router.asPath.split('?');

    useEffect(() => {
        // Getting body request from cookie
        const bodyRequestProducts = getBodyRequestProductsFromCookie();

        let limit = defaultLimit;
        if (bodyRequestProducts.limit) {
            limit = bodyRequestProducts.limit;
        }

        const count = Math.ceil(categoryProducts.count / limit);
        setPageCount(count);
    }, [url, categoryProducts]);

    const handlePageClick = async (data) => {
        // Getting body request from cookie
        const bodyRequestProducts = getBodyRequestProductsFromCookie();

        // If the body request cookie does not have the validity key property, reload
        if (!bodyRequestProducts.key) {
            return router.reload();
        }

        // Body request : filter
        const filterRequest = convertFilter(bodyRequestProducts.filter, lang);

        // Body request : page
        const pageRequest = data.selected + 1;
        if (forcePage) {
            return router.push(`${url}?page=${pageRequest}`);
        }
        if (pageRequest > 1) {
            bodyRequestProducts.page = pageRequest;
        } else {
            delete bodyRequestProducts.page;
        }

        // Body request : limit
        let limitRequest = defaultLimit;
        if (bodyRequestProducts.limit) {
            limitRequest = bodyRequestProducts.limit;
        }

        // Body request : sort
        let sortRequest = { sortWeight: -1 };
        if (bodyRequestProducts.sort) {
            const [sortField, sortValue] = bodyRequestProducts.sort.split('|');
            sortRequest                  = { [sortField]: parseInt(sortValue) };
        }

        // Updating the products list
        try {
            const products = await getProductsList({ PostBody: { filter: filterRequest, page: pageRequest, limit: limitRequest, sort: sortRequest } });

            // If page > 1 and no product, reload
            if (!products.datas.length && pageRequest > 1) {
                const count = Math.ceil(products.count / limitRequest);
                if (count > 1) {
                    bodyRequestProducts.page = count;
                } else {
                    delete bodyRequestProducts.page;
                }

                // Setting body request cookie
                document.cookie = 'bodyRequestProducts=' + stringToBase64(JSON.stringify(bodyRequestProducts)) + '; path=/; max-age=43200;';

                return router.reload();
            }
            setCategoryProducts(products);

            const priceEnd = {
                min: Math.floor(products.unfilteredPriceSortMin.ati),
                max: Math.ceil(products.unfilteredPriceSortMax.ati)
            };
    
            // If price end has changed
            if (priceEnd.min !== categoryPriceEnd.min || priceEnd.max !== categoryPriceEnd.max) {
                // If filter min or max price are outside of range, reload
                if (bodyRequestProducts.filter?.price && (bodyRequestProducts.filter.price.min > priceEnd.max || bodyRequestProducts.filter.price.max < priceEnd.min)) {
                    return router.reload();
                }
                
                // Detecting bad price end in price filter of body request cookie
                filterPriceFix(bodyRequestProducts, priceEnd);
    
                // Setting the new price end
                setCategoryPriceEnd(priceEnd);
            }

            // Setting body request in redux
            setCategoryBodyRequest({ ...bodyRequestProducts });
    
            // Setting body request cookie
            document.cookie = 'bodyRequestProducts=' + stringToBase64(JSON.stringify(bodyRequestProducts)) + '; path=/; max-age=43200;';
        } catch (err) {
            console.error(err);
        }
    };

    const loadMoreData = async () => {
        setIsLoading(true);

        // Getting body request from cookie
        const bodyRequestProducts = getBodyRequestProductsFromCookie();

        // If the body request cookie does not have the validity key property, reload
        if (!bodyRequestProducts.key) {
            return router.reload();
        }

        // Body request : filter
        const filterRequest = convertFilter(bodyRequestProducts.filter, lang);

        // Body request : page
        const pageRequest        = (categoryBodyRequest.page || 1) + 1;
        bodyRequestProducts.page = pageRequest;

        // Body request : limit
        let limitRequest = defaultLimit;
        if (bodyRequestProducts.limit) {
            limitRequest = bodyRequestProducts.limit;
        }

        // Body request : sort
        let sortRequest = { sortWeight: -1 };
        if (bodyRequestProducts.sort) {
            const [sortField, sortValue] = bodyRequestProducts.sort.split('|');
            sortRequest                  = { [sortField]: parseInt(sortValue) };
        }

        // Updating the products list
        try {
            const products = await getProductsList({ PostBody: { filter: filterRequest, page: pageRequest, limit: limitRequest, sort: sortRequest } });

            // If page > 1 and no product, reload
            if (!products.datas.length && pageRequest > 1) {
                const count = Math.ceil(products.count / limitRequest);
                if (count > 1) {
                    bodyRequestProducts.page = count;
                } else {
                    delete bodyRequestProducts.page;
                }

                // Setting body request cookie
                document.cookie = 'bodyRequestProducts=' + stringToBase64(JSON.stringify(bodyRequestProducts)) + '; path=/; max-age=43200;';

                return router.reload();
            }
            categoryProducts.datas = [...categoryProducts.datas, ...products.datas];
            setCategoryProducts({ ...categoryProducts });

            const priceEnd = {
                min: Math.floor(products.unfilteredPriceSortMin.ati),
                max: Math.ceil(products.unfilteredPriceSortMax.ati)
            };
    
            // If price end has changed
            if (priceEnd.min !== categoryPriceEnd.min || priceEnd.max !== categoryPriceEnd.max) {
                // If filter min or max price are outside of range, reload
                if (bodyRequestProducts.filter?.price && (bodyRequestProducts.filter.price.min > priceEnd.max || bodyRequestProducts.filter.price.max < priceEnd.min)) {
                    return router.reload();
                }

                // Detecting bad price end in price filter of body request cookie
                filterPriceFix(bodyRequestProducts, priceEnd);
    
                // Setting the new price end
                setCategoryPriceEnd(priceEnd);
            }

            // Setting body request in redux
            setCategoryBodyRequest({ ...bodyRequestProducts });

            // Setting body request cookie
            document.cookie = 'bodyRequestProducts=' + stringToBase64(JSON.stringify(bodyRequestProducts)) + '; path=/; max-age=43200;';
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="tab-pane-wrap w-tab-pane w--tab-active">
            <div className="w-dyn-list">
                {
                    paginationMode > 0 && !forcePage ? (
                        <InfiniteScroll
                            dataLength={categoryProducts.datas.length}
                            next={paginationMode > 1 ? undefined : loadMoreData}
                            hasMore={(categoryBodyRequest.page || 1) < pageCount}
                            loader={
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    {
                                        paginationMode > 1 ? (
                                            <Button
                                                type="button"
                                                text={t('components/pagination:loadMoreData')}
                                                loadingText={t('components/pagination:loading')}
                                                isLoading={isLoading}
                                                className="w-commerce-commerceaddtocartbutton order-button"
                                                hookOnClick={loadMoreData}
                                            />
                                        ) : (
                                            <span>{t('components/pagination:loading')}</span>
                                        )
                                    }
                                </div>
                            }
                        >
                            {children}
                        </InfiniteScroll>
                    ) : (
                        children
                    )
                }
            </div>
            {
                pageCount > 1 && (!paginationMode || forcePage) && (
                    <ReactPaginate
                        previousLabel={'<'}
                        nextLabel={'>'}
                        breakLabel={'...'}
                        forcePage={(categoryBodyRequest.page || 1) - 1}
                        pageCount={pageCount}
                        marginPagesDisplayed={2}
                        pageRangeDisplayed={5}
                        onPageChange={handlePageClick}
                        containerClassName={'w-pagination-wrapper pagination'}
                        activeClassName={'active'}
                    />
                )
            }
        </div>
    );
}