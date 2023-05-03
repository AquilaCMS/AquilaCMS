import parse                     from 'html-react-parser';
import absoluteUrl               from 'next-absolute-url';
import getT                      from 'next-translate/getT';
import useTranslation            from 'next-translate/useTranslation';
import Link                      from 'next/link';
import { useRouter }             from 'next/router';
import Breadcrumb                from '@components/navigation/Breadcrumb';
import Layout                    from '@components/layouts/Layout';
import NextSeoCustom             from '@components/tools/NextSeoCustom';
import BlockCMS                  from '@components/common/BlockCMS';
import { getBlogArticle }        from '@aquilacms/aquila-connector/api/blog';
import { getBreadcrumb }         from '@aquilacms/aquila-connector/api/breadcrumb';
import { generateURLImageCache } from '@aquilacms/aquila-connector/lib/utils';
import { dispatcher }            from '@lib/redux/dispatcher';
import { useSiteConfig }         from '@lib/hooks';
import { initAxios, formatDate } from '@lib/utils';


export async function getServerSideProps({ defaultLocale, locale, params, query, req, res, resolvedUrl }) {
    initAxios(locale, req, res);

    let blogArticle = {};
    try {
        blogArticle = await getBlogArticle({ PostBody: { filter: { [`translation.${locale}.slug`]: params.article } } }, query.preview, locale);
        if (!blogArticle) {
            return { notFound: true };
        }
    } catch (err) {
        return { notFound: true };
    }

    let breadcrumb = [];
    try {
        breadcrumb = await getBreadcrumb(`${defaultLocale !== locale ? `/${locale}` : ''}${resolvedUrl}`);
    } catch (err) {
        const t = await getT(locale, 'common');
        console.error(err.message || t('common:message.unknownError'));
    }

    // Get URLs for language change
    const urlsLanguages = [];
    for (const [lang, sl] of Object.entries(blogArticle.slug)) {
        urlsLanguages.push({ lang, url: `/blog/${sl}` });
    }

    const actions = [
        {
            type : 'SET_URLS_LANGUAGES',
            value: urlsLanguages
        }
    ];

    const pageProps = await dispatcher(locale, req, res, actions);

    // URL origin
    const { origin }            = absoluteUrl(req);
    pageProps.props.origin      = origin;
    pageProps.props.blogArticle = blogArticle;
    pageProps.props.breadcrumb  = breadcrumb;
    return pageProps;
}

export default function BlogArticle({ blogArticle, breadcrumb, origin }) {
    const router          = useRouter();
    const { environment } = useSiteConfig();
    const { lang, t }     = useTranslation();

    let [url] = router.asPath.split('?');
    if (router.defaultLocale !== lang) {
        url = `/${lang}${url}`;
    }

    return (
        <Layout>
            <NextSeoCustom
                title={`${environment?.siteName} - ${blogArticle.title}`}
                canonical={`${origin}${url}`}
                lang={lang}
                image={`${origin}/${blogArticle.img}`}
            />

            <div className="header-section-carte" style={{ backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.59), rgba(250, 140, 78, 0.72)), url(' + generateURLImageCache('blog', '1920x266-100-crop-center', blogArticle._id, blogArticle.slug[lang], blogArticle.img) + ')' }}>
                <div className="container-flex-2">
                    <div className="title-wrap-centre">
                        <h1 className="header-h1"><span className="brand-span">{blogArticle.title}</span></h1>
                    </div>
                </div>
            </div>

            <div className="content-section-short-product">
                <Breadcrumb items={breadcrumb} origin={origin} />
                <div className="container-flex-2">
                    <div className="container w-container">
                        <h3>{blogArticle.title}</h3>
                        <p className="blog-date" style={{ fontStyle: 'italic' }}>{formatDate(blogArticle.createdAt, lang, { hour: '2-digit', minute: '2-digit', weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        <div style={{ borderTop: '2px solid #ff8946', paddingTop: '15px', borderBottom: '2px solid #ff8946' }}>{parse(blogArticle.content.text)}</div>
                        <Link href="/blog">
                            <button type="button" className="button bottomspace w-button" style={{ marginTop: '60px' }}>{t('common:previous')}</button>
                        </Link>
                    </div> 
                </div>
            </div>

            <BlockCMS nsCode="info-bottom-1" /> {/* TODO : il faudrait afficher le contenu d'une description de la catégorie rattachée ! */}
        </Layout>
    );
}