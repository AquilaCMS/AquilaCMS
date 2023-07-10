import absoluteUrl                      from 'next-absolute-url';
import useTranslation                   from 'next-translate/useTranslation';
import Layout                           from '@components/layouts/Layout';
import NextSeoCustom                    from '@components/tools/NextSeoCustom';
import BlockCMS                         from '@components/common/BlockCMS';
import { dispatcher }                   from '@lib/redux/dispatcher';
import { getPageStatic }                from '@aquilacms/aquila-connector/api/static';
import { useStaticPage, useSiteConfig } from '@lib/hooks';
import { initAxios }                    from '@lib/utils';

export async function getServerSideProps({ locale, query, req, res }) {
    initAxios(locale, req, res);

    let staticPage = {};
    try {
        staticPage = await getPageStatic('home', query.preview, locale);
    } catch (err) {
        return { notFound: true };
    }

    const actions = [
        {
            type : 'SET_STATICPAGE',
            value: staticPage
        }
    ];

    const pageProps = await dispatcher(locale, req, res, actions);

    // URL origin
    const { origin }       = absoluteUrl(req);
    pageProps.props.origin = origin;

    return pageProps;
}

export default function Home({ origin }) {
    const { staticPage }  = useStaticPage();
    const { environment } = useSiteConfig();
    const { lang }        = useTranslation();

    return (
        <Layout>
            <NextSeoCustom
                title={`${environment?.siteName} - ${staticPage.title}`}
                description={staticPage.metaDesc}
                canonical={origin}
                lang={lang}
                image={`${origin}/images/medias/max-100/605363104b9ac91f54fcabac/Logo.jpg`}
            />

            <BlockCMS content={staticPage.content} />
        </Layout>
    );
}
