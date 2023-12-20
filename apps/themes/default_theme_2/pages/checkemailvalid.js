import { useEffect, useState }       from 'react';
import useTranslation                from 'next-translate/useTranslation';
import Layout                        from '@components/layouts/Layout';
import NextSeoCustom                 from '@components/tools/NextSeoCustom';
import { validateAccount }           from '@aquilacms/aquila-connector/api/user';
import { useSiteConfig }             from '@lib/hooks';
import { initAxios, serverRedirect } from '@lib/utils';
import { dispatcher }                from '@lib/redux/dispatcher';


export async function getServerSideProps({ locale, query, req, res }) {
    initAxios(locale, req, res);

    if (!query.token) {
        return serverRedirect('/');
    }

    const pageProps       = await dispatcher(locale, req, res);
    pageProps.props.token = query.token;
    return pageProps;
}


export default function CheckEmailValid({ token }) {
    const [user, setUser]       = useState({});
    const [message, setMessage] = useState();
    const { environment }       = useSiteConfig();
    const { t }                 = useTranslation();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const newUser = await validateAccount(token);
                setUser(newUser);
            } catch (err) {
                setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
            }
        };
        fetchData();
    }, []);

    return (
        <Layout>
            <NextSeoCustom
                noindex={true}
                title={`${environment?.siteName} - ${t('pages/checkemailvalid:title')}`}
                description={t('pages/checkemailvalid:description')}
            />

            <div className="header-section-panier">
                <div className="container-flex-2">
                    <div className="title-wrap-centre">
                        <h1 className="header-h1">{t('pages/checkemailvalid:titleH1')}</h1>
                    </div>
                </div>
            </div>
            <div className="section-tunnel">
                <div className="container-tunnel">
                    <div className="col-log w-row" style={{ justifyContent: 'center' }}>
                        {user?.isActiveAccount ? t('pages/checkemailvalid:accountActive') : t('pages/checkemailvalid:accountInactive')}
                    </div>
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
        </Layout>
    );
}
