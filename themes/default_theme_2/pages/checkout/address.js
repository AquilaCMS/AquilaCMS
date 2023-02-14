import useTranslation                                               from 'next-translate/useTranslation';
import AddressStep                                                  from '@components/checkout/AddressStep';
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

export default function CheckoutAddress({ user }) {
    const { environment } = useSiteConfig();
    const { t }           = useTranslation();
    
    return (
        <LightLayout>
            <NextSeoCustom
                noindex={true}
                title={`${environment?.siteName} - ${t('pages/checkout:address.title')}`}
                description={t('pages/checkout:address.description')}
            />
            
            <div className="header-section-panier">
                <div className="container-flex-2">
                    <div className="title-wrap-centre">
                        <h1 className="header-h1">{t('pages/checkout:address.titleH1')}</h1>
                    </div>
                </div>
            </div>

            <div className="section-tunnel">
                <div className="container-tunnel">
                    <div className="container-step w-container">
                        <h2 className="heading-steps">2</h2>
                        <h2 className="heading-2-steps">{t('pages/checkout:address.step')}</h2>
                    </div>
                    
                    { moduleHook('checkout-address-step', { user }) || <AddressStep user={user} /> }
                </div>
            </div>
        </LightLayout>
    );
}