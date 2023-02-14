import Head           from 'next/head';
import Link           from 'next/link';
import LightLayout    from '@components/layouts/LightLayout';
import useTranslation from 'next-translate/useTranslation';

export default function Custom404() {
    const { t } = useTranslation();

    return (
        <LightLayout>
            <Head>
                <title>{t('pages/error:title404')}</title>
            </Head>
            <div className="utility-page-wrap-2">
                <div className="container flex-vertical">
                    <h2>{t('pages/error:title404')}</h2>
                    <div>
                        <p className="utility-paragraph">
                            {t('pages/error:text404')}<br />
                            <Link href="/" className="link-2">
                                {t('pages/error:back')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </LightLayout>
    );
}