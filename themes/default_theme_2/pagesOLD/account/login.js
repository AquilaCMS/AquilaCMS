import useTranslation                                   from 'next-translate/useTranslation';
import Layout                                           from '@components/layouts/Layout';
import LoginBlock                                       from '@components/login/LoginBlock';
import RegisterBlock                                    from '@components/login/RegisterBlock';
import NextSeoCustom                                    from '@components/tools/NextSeoCustom';
import { useSiteConfig }                                from '@lib/hooks';
import { initAxios, authProtectedPage, serverRedirect } from '@lib/utils';
import { dispatcher }                                   from '@lib/redux/dispatcher';

export async function getServerSideProps({ locale, req, res }) {
    initAxios(locale, req, res);

    // If the user is already logged in, we will automatically redirect to the page /account/informations
    const user = await authProtectedPage(req.headers.cookie);
    if (user) {
        return serverRedirect('/account/informations');
    }
    return dispatcher(locale, req, res);
}

export default function Login() {
    const { environment } = useSiteConfig();
    const { t }           = useTranslation();
    
    return (
        <Layout>
            <NextSeoCustom
                title={`${environment?.siteName} - ${t('pages/account/login:title')}`}
                description={t('pages/account/login:description')}
            />
            
            <div className="header-section-panier">
                <div className="container-flex-2">
                    <div className="title-wrap-centre">
                        <h1 className="header-h1">{t('pages/account/login:titleH1')}</h1>
                    </div>
                </div>
            </div>

            <div className="section-tunnel">
                <div className="container-tunnel">
                    <div className="col-log w-row">
                        <LoginBlock />

                        <div className="w-col w-col-2" />

                        <RegisterBlock />
                    </div>
                </div>
            </div>
        </Layout>
    );
}
