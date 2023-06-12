import { useEffect }                                         from 'react';
import Link                                                  from 'next/link';
import useTranslation                                        from 'next-translate/useTranslation';
import CartDiscount                                          from '@components/cart/CartDiscount';
import CartItem                                              from '@components/cart/CartItem';
import Layout                                                from '@components/layouts/Layout';
import NextSeoCustom                                         from '@components/tools/NextSeoCustom';
import { useAqModules, useCart, useSiteConfig }              from '@lib/hooks';
import { initAxios, formatPrice, isAllAqModulesInitialised } from '@lib/utils';
import { dispatcher }                                        from '@lib/redux/dispatcher';

export async function getServerSideProps({ locale, req, res }) {
    initAxios(locale, req, res);

    const pageProps = await dispatcher(locale, req, res);
    return pageProps;
}

export default function CheckoutCart() {
    const { aqModules }   = useAqModules();
    const { cart }        = useCart();
    const { environment } = useSiteConfig();
    const { t }           = useTranslation();

    useEffect(() => {
        // Event when all Aquila modules ("global" type) are initialised
        if (isAllAqModulesInitialised(aqModules)) {
            const addTransaction = new CustomEvent('viewCart', { detail: { cart } });
            window.dispatchEvent(addTransaction);
        }
    }, [aqModules]);

    return (
        <Layout>
            <NextSeoCustom
                noindex={true}
                title={`${environment?.siteName} - ${t('pages/checkout:cart.title')}`}
                description={t('pages/checkout:cart.description')}
            />
            
            <div className="header-section-panier">
                <div className="container-flex-2">
                    <div className="title-wrap-centre">
                        <h1 className="header-h1">{t('pages/checkout:cart.titleH1')}</h1>
                    </div>
                </div>
            </div>

            <div className="section-tunnel">
                <div className="container-tunnel">
                    {
                        cart.items?.filter((item) => !item.typeDisplay)?.length > 0 ? (
                            <form className="w-commerce-commercecartform">
                                <div className="w-commerce-commercecartlist" >
                                    {cart.items?.filter((item) => !item.typeDisplay).map((item) => (
                                        <CartItem item={item} key={item._id} />
                                    ))}
                                </div>

                                <CartDiscount />

                                <div className="w-commerce-commercecartfooter">
                                    <div className="w-commerce-commercecartlineitem cart-line-item">
                                        <div>{t('pages/checkout:cart.subTotal')}</div>
                                        <div>{formatPrice(cart.priceSubTotal.ati)}</div>
                                    </div>
                                    {
                                        cart.promos[0] && (
                                            <div className="w-commerce-commercecartlineitem cart-line-item">
                                                <div>{t('pages/checkout:cart.discount')}</div>
                                                <div>- {formatPrice(cart.promos[0].discountATI)}</div>
                                            </div>
                                        )
                                    }
                                    {
                                        cart.delivery?.method && cart.delivery?.value && (
                                            <div className="w-commerce-commercecartlineitem cart-line-item">
                                                <div>{t('pages/checkout:cart.delivery')}</div>
                                                <div>{formatPrice(cart.delivery.value.ati)}</div>
                                            </div>
                                        )
                                    }
                                    <div className="w-commerce-commercecartlineitem cart-line-item">
                                        <div>{t('pages/checkout:cart.total')}</div>
                                        <div className="w-commerce-commercecartordervalue text-block">
                                            {formatPrice(cart.priceTotal.ati)}
                                        </div>
                                    </div>
                                </div>
                                <Link href="/checkout/address" className="checkout-button-2 w-button">
                                    {t('pages/checkout:cart.ordering')}
                                </Link>
                            </form>
                        ) : (
                            <div className="w-commerce-commercecartemptystate empty-state">
                                <div>{t('pages/checkout:cart.empty')}</div>
                                <div className="button-arrow-wrap">
                                    <Link href="/" className="button w-button">
                                        {t('pages/checkout:cart.goToHome')}
                                    </Link>
                                </div>
                            </div>
                        )
                    }
                </div>
            </div>
        </Layout>
    );
}