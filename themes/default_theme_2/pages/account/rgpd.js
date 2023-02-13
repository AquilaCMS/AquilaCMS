import { useState }                                                  from 'react';
import { useRouter }                                                 from 'next/router';
import useTranslation                                                from 'next-translate/useTranslation';
import { Modal }                                                     from 'react-responsive-modal';
import AccountLayout                                                 from '@components/account/AccountLayout';
import BlockCMS                                                      from '@components/common/BlockCMS';
import NextSeoCustom                                                 from '@components/tools/NextSeoCustom';
import { getBlocksCMS }                                              from '@aquilacms/aquila-connector/api/blockcms';
import { dataUserExport, deleteUser }                                from '@aquilacms/aquila-connector/api/user';
import { useSiteConfig }                                             from '@lib/hooks';
import { initAxios, authProtectedPage, serverRedirect, unsetCookie } from '@lib/utils';
import { dispatcher }                                                from '@lib/redux/dispatcher';

import 'react-responsive-modal/styles.css';

export async function getServerSideProps({ locale, req, res }) {
    initAxios(locale, req, res);
    
    const user = await authProtectedPage(req.headers.cookie);
    if (!user) {
        return serverRedirect('/account/login?redirect=' + encodeURI('/account/rgpd'));
    }

    const actions = [
        {
            type: 'PUSH_CMSBLOCKS',
            func: getBlocksCMS.bind(this, ['top-text-rgpd'], locale)
        }
    ];

    const pageProps      = await dispatcher(locale, req, res, actions);
    pageProps.props.user = user;
    return pageProps;
}

export default function Rgpd({ user }) {
    const [openModal, setOpenModal] = useState();
    const [message, setMessage]     = useState();
    const router                    = useRouter();
    const { environment }           = useSiteConfig();
    const { t }                     = useTranslation();

    const exportData = async () => {
        try {
            const response = await dataUserExport(user._id);
            const url      = window.URL.createObjectURL(new Blob([response.data]));
            const link     = document.createElement('a');
            link.href      = url;
            link.setAttribute('download', 'dataExport.txt');
            document.body.appendChild(link);
            link.click();
        } catch(err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        }
    };

    const deleteAccount = async () => {
        try {
            await deleteUser(user._id);
            setOpenModal(false);

            // Logout
            unsetCookie('jwt');

            // Redirection to login
            router.push('/account/login');
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        }
    };

    const onOpenModal = () => {
        setOpenModal(true);
    };

    const onCloseModal = () => {
        setOpenModal(false);
    };

    return (
        <AccountLayout active="3">
            <NextSeoCustom
                noindex={true}
                title={`${environment?.siteName} - ${t('pages/account/rgpd:title')}`}
                description=""
            />
            
            <div className="container-tunnel-01">
                <h2 className="heading-2-steps">{t('pages/account/rgpd:titleNav')}</h2>
            </div>
            <div className="container-account">
                <div className="div-block-tunnel w-form">
                    <BlockCMS nsCode="top-text-rgpd" />
                    <div style={{ marginTop: '30px' }}>
                        <button type="button" onClick={exportData} className="log-button w-button">{t('pages/account/rgpd:buttonExportData')}</button>
                        <p>{t('pages/account/rgpd:labelExportData')}</p>
                    </div>
                    <div>
                        <button type="button" onClick={onOpenModal} className="log-button w-button">{t('pages/account/rgpd:buttonRemoveAccount')}</button>
                        <p>{t('pages/account/rgpd:labelRemoveAccount')}</p>
                    </div>
                    <Modal open={openModal} onClose={onCloseModal} center>
                        <h3>{t('pages/account/rgpd:modalTitle')}</h3>
                        <p>{t('pages/account/rgpd:modalWarning')}</p>
                        <div>
                            <button type="button" className="button w-button" onClick={deleteAccount}>
                                {t('pages/account/rgpd:yes')}
                            </button>
                            &nbsp;
                            <button type="button" className="button w-button" onClick={onCloseModal}>
                                {t('pages/account/rgpd:no')}
                            </button>
                        </div>
                    </Modal>
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
        </AccountLayout>
    );
}
