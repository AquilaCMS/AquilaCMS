import { useEffect, useState }                                                                  from 'react';
import Link                                                                                     from 'next/link';
import { useRouter }                                                                            from 'next/router';
import useTranslation                                                                           from 'next-translate/useTranslation';
import cookie                                                                                   from 'cookie';
import Layout                                                                                   from '@components/layouts/Layout';
import OrderDetails                                                                             from '@components/order/OrderDetails';
import NextSeoCustom                                                                            from '@components/tools/NextSeoCustom';
import { getOrderById }                                                                         from '@aquilacms/aquila-connector/api/order';
import { useAqModules, useSiteConfig }                                                          from '@lib/hooks';
import { initAxios, authProtectedPage, serverRedirect, unsetCookie, isAllAqModulesInitialised } from '@lib/utils';
import { dispatcher }                                                                           from '@lib/redux/dispatcher';

export async function getServerSideProps({ locale, req, res }) {
    initAxios(locale, req, res);

    const user = await authProtectedPage(req.headers.cookie);
    if (!user) {
        return serverRedirect('/checkout/login?redirect=' + encodeURI('/'));
    }
    return dispatcher(locale, req, res);
}

export default function CheckoutConfirmation() {
    const [order, setOrder] = useState();
    const { aqModules }     = useAqModules();
    const router            = useRouter();
    const { environment }   = useSiteConfig();
    const { lang, t }       = useTranslation();

    useEffect(() => {
        const orderId   = cookie.parse(document.cookie).order_id;
        const fetchData = async () => {
            try {
                const data = await getOrderById(orderId, lang);
                setOrder(data);
                unsetCookie('order_id');
            } catch (err) {
                console.error(err.message || t('common:message.unknownError'));
                router.push('/');
            }
        };
        if (orderId) {
            fetchData();
        } else {
            router.push('/');
        }
    }, []);

    useEffect(() => {
        // Event when all Aquila modules ("global" type) are initialised
        if (order && isAllAqModulesInitialised(aqModules)) {
            const addTransaction = new CustomEvent('purchase', { detail: { order } });
            window.dispatchEvent(addTransaction);
        }
    }, [order, aqModules]);

    if (!order) {
        return null;
    }

    return (
        <Layout>
            <NextSeoCustom
                noindex={true}
                title={`${environment?.siteName} - ${t('pages/checkout:confirmation.title')}`}
                description={t('pages/checkout:confirmation.description')}
            />

            <div className="header-section-panier">
                <div className="container-flex-2">
                    <div className="title-wrap-centre">
                        <h1 className="header-h1">{t('pages/checkout:confirmation.titleH1')}</h1>
                    </div>
                </div>
            </div>
            
            <div className="section-tunnel">
                <div className="container-tunnel-02">
                    <h2 className="heading-2-steps">{t('pages/checkout:confirmation.summary')} : #{order.number}</h2>
                </div>

                <OrderDetails order={order} />

                <div className="container-order" style={{ justifyContent: 'center' }}>
                    <Link href="/account" className="log-button-03 w-button">
                        {t('pages/checkout:confirmation.viewOrders')}
                    </Link>
                </div>
            </div>
        </Layout>
    );
}