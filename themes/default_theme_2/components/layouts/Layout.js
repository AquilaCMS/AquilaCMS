import Head          from 'next/head';
import Header        from '@components/layouts/Header';
import Footer        from '@components/layouts/Footer';
import CookiesBanner from '@components/common/CookiesBanner';
import BlockCMS      from '@components/common/BlockCMS';
import Languages     from '@components/common/Languages';
import SearchBar     from '@components/common/SearchBar';

export default function Layout({ children }) {
    return (
        <>
            <Head>
                <BlockCMS nsCode="head" />
            </Head>

            <BlockCMS nsCode="top-banner" />

            <Languages />

            <SearchBar />

            <Header />

            <main>{children}</main>

            <Footer />

            <CookiesBanner />
        </>
    );
}
