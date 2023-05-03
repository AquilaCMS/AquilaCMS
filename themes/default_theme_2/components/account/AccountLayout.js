import Link           from 'next/link';
import { useRouter }  from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import Layout         from '@components/layouts/Layout';
import { logout }     from '@aquilacms/aquila-connector/api/login';

export default function AccountLayout({ children, active }) {
    const router = useRouter();
    const { t }  = useTranslation();

    const onLogout = async () => {
        await logout();
        router.push('/');
    };

    return (
        <Layout>
            <div className="header-section-panier">
                <div className="container-flex-2">
                    <div className="title-wrap-centre">
                        <h1 className="header-h1">{t('components/account/accountLayout:titleH1')}</h1>
                    </div>
                </div>
            </div>
            <div className="section-account">
                <div className="tab-pane-wrap-account w-tabs">
                    <div className="tab-menu-round-account w-tab-menu">
                        <Link href="/account/informations" className={(active === '1' ? 'w--current' : '') + ' tab-link-round w-inline-block w-tab-link'}>
                            <div>{t('components/account/accountLayout:navigation.myInformations')}</div>
                        </Link>
                        <Link href="/account" className={(active === '2' ? 'w--current' : '') + ' tab-link-round w-inline-block w-tab-link'}>
                            <div>{t('components/account/accountLayout:navigation.myOrders')}</div>
                        </Link>
                        <Link href="/account/rgpd" className={(active === '3' ? 'w--current' : '') + ' tab-link-round w-inline-block w-tab-link'}>
                            <div>{t('components/account/accountLayout:navigation.rgpd')}</div>
                        </Link>
                        <button type="button" className="tab-link-round w-inline-block w-tab-link" onClick={onLogout}>{t('components/account/accountLayout:navigation.logout')}</button>
                    </div>
                    <div className="w-tab-content">
                        <main>{children}</main>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
