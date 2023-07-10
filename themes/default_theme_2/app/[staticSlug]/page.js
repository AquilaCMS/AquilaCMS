import { createStore }     from '@lib/redux/store';
import { defaultDispatch } from '@lib/redux/dispatcher';
import ReduxProvider       from '@lib/redux/provider';
import useTranslation      from 'next-translate/useTranslation';
import { getPageStatic }   from '@aquilacms/aquila-connector/api/static';
import BlockCMS            from '@components/common/BlockCMS';
import Layout              from '@components/layouts/Layout';

export default async function Home({ params, searchParams }) {
    const store    = createStore();
    const { lang } = useTranslation();
    
    await defaultDispatch(store, lang);


    const staticPage = await getPageStatic(params.staticSlug, searchParams.preview, lang);

    // Get URLs for language change
    const urlsLanguages = [];
    if (staticPage) {
        for (const [lang, sl] of Object.entries(staticPage.slug)) {
            urlsLanguages.push({ lang, url: `/${sl}` });
        }
    }
    store.dispatch({ type: 'SET_URLS_LANGUAGES', data: urlsLanguages });

    return (
        <ReduxProvider preloadedState={store.getState()}>
            <Layout>
                <BlockCMS content={staticPage.content} />
                <BlockCMS nsCode="bottom-parallax" />
            </Layout>
        </ReduxProvider>
    );
}