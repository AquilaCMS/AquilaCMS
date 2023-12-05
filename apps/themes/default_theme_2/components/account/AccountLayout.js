import useTranslation from 'next-translate/useTranslation';
import AccountMenu    from '@components/account/AccountMenu';
import Layout         from '@components/layouts/Layout';

export default function AccountLayout({ children, active }) {
    const { t } = useTranslation();

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
                    <AccountMenu active={active} />
                    <div className="w-tab-content">
                        <main>{children}</main>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
