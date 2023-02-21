import { Fragment, useEffect, useState }                                                             from 'react';
import ReactPaginate                                                                                 from 'react-paginate';
import { useRouter }                                                                                 from 'next/router';
import useTranslation                                                                                from 'next-translate/useTranslation';
import Cookies                                                                                       from 'cookies';
import AccountLayout                                                                                 from '@components/account/AccountLayout';
import OrderDetails                                                                                  from '@components/order/OrderDetails';
import NextSeoCustom                                                                                 from '@components/tools/NextSeoCustom';
import { getOrders }                                                                                 from '@aquilacms/aquila-connector/api/order';
import { useSelectPage, useOrders, useSiteConfig }                                                   from '@lib/hooks';
import { initAxios, authProtectedPage, serverRedirect, formatPrice, formatOrderStatus, unsetCookie } from '@lib/utils';
import { dispatcher }                                                                                from '@lib/redux/dispatcher';

export async function getServerSideProps({ locale, req, res, resolvedUrl }) {
    initAxios(locale, req, res);

    const user = await authProtectedPage(req.headers.cookie);
    if (!user) {
        return serverRedirect('/account/login?redirect=' + encodeURI('/account'));
    }

    // Get cookie server instance
    const cookiesServerInstance = new Cookies(req, res);

    // Get page from cookie
    let page         = 1;
    const [url]      = resolvedUrl.split('?');
    const cookiePage = cookiesServerInstance.get('page');
    // If cookie page exists
    if (cookiePage) {
        try {
            const dataPage = JSON.parse(cookiePage);
            // We take the value only if category ID matches
            // Otherwise, we delete "page" cookie
            if (dataPage.url === url) {
                page = dataPage.page;
            } else {
                unsetCookie('page', cookiesServerInstance);
            }
        } catch (err) {
            unsetCookie('page', cookiesServerInstance);
        }
    }

    const limit = 15;

    const actions = [
        {
            type : 'SET_SELECT_PAGE',
            value: page
        }, {
            type: 'SET_ORDERS',
            func: getOrders.bind(this, locale, { PostBody: { page, limit } })
        }
    ];

    const pageProps       = await dispatcher(locale, req, res, actions);
    pageProps.props.limit = limit;
    pageProps.props.user  = user;
    return pageProps;
}

export default function Account({ limit }) {
    const [viewOrders, setViewOrders]   = useState([]);
    const { selectPage, setSelectPage } = useSelectPage();
    const { orders, setOrders }         = useOrders();
    const router                        = useRouter();
    const { environment }               = useSiteConfig();
    const { lang, t }                   = useTranslation();

    // Getting URL page
    const [url] = router.asPath.split('?');

    useEffect(() => {
        return () => unsetCookie('page');
    }, []);

    const onChangeViewOrders = (index) => {
        viewOrders[index] = !viewOrders[index];
        setViewOrders([...viewOrders]);
    };

    const handlePageClick = async (data) => {
        const page = data.selected + 1;

        setViewOrders([]);

        // Updating the products list
        const orders = await getOrders(lang, { PostBody: { page, limit } });
        setOrders(orders);

        // Updating page
        setSelectPage(page);

        // Setting category page cookie
        if (page > 1) {
            document.cookie = 'page=' + JSON.stringify({ url, page }) + '; path=/; max-age=43200;';
        } else {
            // Page 1... so useless "page" cookie
            unsetCookie('page');
        }
    };

    const pageCount = Math.ceil(orders.count / limit);
    
    return (
        <AccountLayout active="2">
            <NextSeoCustom
                noindex={true}
                title={`${environment?.siteName} - ${t('pages/account/index:title')}`}
                description=""
            />
            
            <div className="container-tunnel-02">
                <h2 className="heading-2-steps">{t('pages/account/index:titleNav')}</h2>
            </div>
            <div className="container-order-list">
                <div className="div-block-order-liste">
                    {
                        orders.datas.length ? orders.datas.map((order, index) => {
                            return (
                                <Fragment key={order._id}>
                                    <div className="w-commerce-commercecheckoutsummaryblockheader block-header">
                                        <h5 className="heading-6" style={{ width: '230px' }}>{t('pages/account/index:order')} : #{order.number}</h5>
                                        <p className="paragraph" style={{ width: '100px' }}>{formatPrice(order.priceTotal.ati)}</p>
                                        <p className="paragraph" style={{ width: '300px' }}>{formatOrderStatus(order.status, t)}</p>
                                        <div className="lien_voir w-inline-block" style={{ cursor: 'pointer' }} onClick={() => onChangeViewOrders(index)}>
                                            <h6 className="heading-bouton-voir">{t('pages/account/index:view')}</h6>
                                            <img src="/images/Plus.svg" alt="" className={`plus-2${viewOrders[index] ? ' plus-2-active' : ''}`} />
                                        </div>
                                    </div>
                                    <div className="section-detail-order" style={{ display: !viewOrders[index] ? 'none' : 'block' }}>
                                        <div className="container-tunnel-02">
                                            <h2 className="heading-5 center">{t('pages/account/index:orderSummary')} : #{order.number}</h2>
                                        </div>
                                        <OrderDetails order={order} setOrders={setOrders} />
                                    </div>
                                </Fragment>
                            );
                        }) : <p>{t('pages/account/index:noOrder')}</p>
                    }
                </div>
                {
                    pageCount > 1 && (
                        <ReactPaginate
                            previousLabel={'<'}
                            nextLabel={'>'}
                            breakLabel={'...'}
                            forcePage={selectPage - 1}
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
        </AccountLayout>
    );
}
