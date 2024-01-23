import Link               from 'next/link';
import { useRouter }      from 'next/router';
import useTranslation     from 'next-translate/useTranslation';
import { logout }         from '@aquilacms/aquila-connector/api/login';
import { useLoadModules } from '@lib/hooks';

export default function AccountMenu({ active }) {
    const router       = useRouter();
    const { t }        = useTranslation();
    const modulesHooks = useLoadModules([
        { id: 'accountMenu', props: { active } }
    ]);

    const onLogout = async () => {
        await logout();
        router.push('/');
    };

    return (
        <div className="tab-menu-round-account w-tab-menu">
            <Link href="/account" className={(active === '1' ? 'w--current' : '') + ' tab-link-round w-inline-block w-tab-link'}>
                <div>{t('components/account/accountLayout:navigation.myInformations')}</div>
            </Link>
            <Link href="/account/orders" className={(active === '2' ? 'w--current' : '') + ' tab-link-round w-inline-block w-tab-link'}>
                <div>{t('components/account/accountLayout:navigation.myOrders')}</div>
            </Link>
            <Link href="/account/rgpd" className={(active === '3' ? 'w--current' : '') + ' tab-link-round w-inline-block w-tab-link'}>
                <div>{t('components/account/accountLayout:navigation.rgpd')}</div>
            </Link>
            {modulesHooks['accountMenu']}
            <button type="button" className="tab-link-round w-inline-block w-tab-link" onClick={onLogout}>{t('components/account/accountLayout:navigation.logout')}</button>
        </div>
    );
}
