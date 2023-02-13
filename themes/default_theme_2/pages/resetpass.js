import { useState }                  from 'react';
import { useRouter }                 from 'next/router';
import useTranslation                from 'next-translate/useTranslation';
import Layout                        from '@components/layouts/Layout';
import Button                        from '@components/ui/Button';
import NextSeoCustom                 from '@components/tools/NextSeoCustom';
import { resetPassword }             from '@aquilacms/aquila-connector/api/user';
import { useSiteConfig }             from '@lib/hooks';
import { initAxios, serverRedirect } from '@lib/utils';
import { dispatcher }                from '@lib/redux/dispatcher';


export async function getServerSideProps({ locale, query, req, res }) {
    initAxios(locale, req, res);

    try {
        const data = await resetPassword(query.token);
        if (data.message === 'Token invalide') {
            return serverRedirect('/');
        }
    } catch (err) {
        return serverRedirect('/');
    }
    

    const pageProps       = await dispatcher(locale, req, res);
    pageProps.props.token = query.token;
    return pageProps;
}


export default function ResetPassword({ token }) {
    const [isLoading, setIsLoading]       = useState(false);
    const [messageReset, setMessageReset] = useState();
    const router                          = useRouter();
    const { environment }                 = useSiteConfig();
    const { t }                           = useTranslation();

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const postForm = e.currentTarget;

        const password      = postForm.password.value;
        const passwordCheck = postForm.passwordCheck.value;
        
        if (password !== passwordCheck) {
            setMessageReset({ type: 'error', message: t('pages/resetpass:passNotMatching') });
            setIsLoading(false);
            return;
        }

        // Reset du mot de passe
        try {
            await resetPassword(token, password);
            router.push('/account/login');
        } catch (err) {
            setMessageReset({ type: 'error', message: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout>
            <NextSeoCustom
                noindex={true}
                title={`${environment?.siteName} - ${t('pages/resetpass:title')}`}
                description={t('pages/resetpass:description')}
            />

            <div className="header-section-panier">
                <div className="container-flex-2">
                    <div className="title-wrap-centre">
                        <h1 className="header-h1">{t('pages/resetpass:titleH1')}</h1>
                    </div>
                </div>
            </div>
            <div className="section-tunnel">
                <div className="container-tunnel">
                    <div className="col-log w-row">

                        <div className="w-col w-col-3" />

                        <form className="col-log-int w-col w-col-6" onSubmit={handlePasswordSubmit}>
                            <div className="log-label">{t('pages/resetpass:information')}</div>
                            <div className="w-form">
                                <div>
                                    <div><input type="password" className="w-input" maxLength={256} name="password" placeholder={t('pages/resetpass:password')} required /></div>
                                    <div><input type="password" className="w-input" maxLength={256} name="passwordCheck" placeholder={t('pages/resetpass:password2')} required /></div>
                                </div>
                            </div>
                            {
                                messageReset && (
                                    <div className={`w-commerce-commerce${messageReset.type}`}>
                                        <div>
                                            {messageReset.message}
                                        </div>
                                    </div>
                                )
                            }
                            <Button text={t('pages/resetpass:validate')} loadingText={t('pages/resetpass:validateLoading')} isLoading={isLoading} className="log-button w-button" />
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
