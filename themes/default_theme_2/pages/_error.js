import Head           from 'next/head';
import Link           from 'next/link';
import useTranslation from 'next-translate/useTranslation';
import Layout         from '@components/layouts/Layout';

function Error({ statusCode }) {

    const { t } = useTranslation();
    
    const title = statusCode === 404 ? t('pages/error:title404') : t('pages/error:title500');
    const text  = statusCode === 404 ? t('pages/error:text404') : (statusCode
        ? `An error ${statusCode} occurred on server`
        : 'An error occurred on client');

    return (
        <Layout>
            <Head>
                <title>{title}</title>
            </Head>
            <div className="utility-page-wrap-2">
                <div className="container flex-vertical">
                    <h2>{title}</h2>
                    <div>
                        <p className="utility-paragraph">{text}<br />
                            <Link href="/" className="link-2">
                                {t('pages/error:back')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default Error;