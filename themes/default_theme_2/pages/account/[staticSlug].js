import useTranslation                                   from 'next-translate/useTranslation';
import AccountLayout                                    from '@components/account/AccountLayout';
import BlockCMS                                         from '@components/common/BlockCMS';
import NextSeoCustom                                    from '@components/tools/NextSeoCustom';
import { getBlockCMS }                                  from '@aquilacms/aquila-connector/api/blockcms';
import { useSiteConfig }                                from '@lib/hooks';
import { initAxios, authProtectedPage, serverRedirect } from '@lib/utils';
import { dispatcher }                                   from '@lib/redux/dispatcher';

export async function getServerSideProps({ locale, params, req, res }) {
    initAxios(locale, req, res);
    
    const user = await authProtectedPage(req.headers.cookie);
    if (!user) {
        return serverRedirect('/account/login?redirect=' + encodeURI(`/account/${params.staticSlug}`));
    }

    const cms = await getBlockCMS(`module-${params.staticSlug}`, locale);
    if (!cms) {
        return { notFound: true };
    }

    const pageProps     = await dispatcher(locale, req, res);
    pageProps.props.cms = cms;
    return pageProps;
}

export default function StaticAccount({ cms }) {
    const { environment } = useSiteConfig();

    return (
        <AccountLayout active="module-booking-aquila-bookings">
            <NextSeoCustom
                noindex={true}
                title={`${environment?.siteName} - ${cms.description}`}
                description=""
            />
            
            <BlockCMS content={cms.content} />
        </AccountLayout>
    );
}
