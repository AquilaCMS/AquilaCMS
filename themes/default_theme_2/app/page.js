import { createStore }     from '@lib/redux/store';
import { defaultDispatch } from '@lib/redux/dispatcher';
import ReduxProvider       from '@lib/redux/provider';
import useTranslation      from 'next-translate/useTranslation';
import { getPageStatic }   from '@aquilacms/aquila-connector/api/static';
import BlockCMS            from '@components/common/BlockCMS';
import Layout              from '@components/layouts/Layout';

export default async function Home({ searchParams }) {
    const store    = createStore();
    const { lang } = useTranslation();
    
    await defaultDispatch(store, lang);

    const staticPage = await getPageStatic('home', searchParams.preview, lang);

    return (
        <ReduxProvider preloadedState={store.getState()}>
            <Layout>
                <BlockCMS content={staticPage.content} />
                <BlockCMS nsCode="bottom-parallax" />
            </Layout>
        </ReduxProvider>
    );
}