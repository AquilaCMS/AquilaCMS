import useTranslation                                               from 'next-translate/useTranslation';
import DeliveryStep                                                 from '@components/checkout/DeliveryStep';
import LightLayout                                                  from '@components/layouts/LightLayout';
import NextSeoCustom                                                from '@components/tools/NextSeoCustom';
import { useSiteConfig }                                            from '@lib/hooks';
import { initAxios, authProtectedPage, serverRedirect, moduleHook } from '@lib/utils';
import { dispatcher }                                               from '@lib/redux/dispatcher';

export async function getServerSideProps({ locale, req, res }) {
    initAxios(locale, req, res);

    const user = await authProtectedPage(req.headers.cookie);
    if (!user) {
        return serverRedirect('/checkout/login?redirect=' + encodeURI('/checkout/address'));
    }
    const pageProps      = await dispatcher(locale, req, res);
    pageProps.props.user = user;
    return pageProps;
}

export default function CheckoutDelivery({ user }) {
    const { environment } = useSiteConfig();
    const { t }           = useTranslation();
    
    return (
        <LightLayout>
            <NextSeoCustom
                noindex={true}
                title={`${environment?.siteName} - ${t('pages/checkout:delivery.title')}`}
                description={t('pages/checkout:delivery.description')}
            />
            
            <div className="header-section-panier">
                <div className="container-flex-2">
                    <div className="title-wrap-centre">
                        <h1 className="header-h1">{t('pages/checkout:delivery.titleH1')}</h1>
                    </div>
                </div>
            </div>

            <div className="section-tunnel">
                <div className="container-tunnel">
                    <div className="container-step w-container">
                        <h2 className="heading-steps">3</h2>
                        <h2 className="heading-2-steps">{t('pages/checkout:delivery.step')}</h2>
                    </div>
                    
                    { moduleHook('checkout-delivery-step', { user }) || <DeliveryStep /> }
                </div>
            </div>
        </LightLayout>
    );
}