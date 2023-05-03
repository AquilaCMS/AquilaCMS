import Link                 from 'next/link';
import useTranslation       from 'next-translate/useTranslation';
import setLanguage          from 'next-translate/setLanguage';
import { useUrlsLanguages } from '@lib/hooks';
import i18n                 from '/i18n';

export default function Languages() {
    const urls     = useUrlsLanguages();
    const { lang } = useTranslation();

    const langs = i18n.locales;

    if (!langs || langs.length < 2) {
        return null;
    }

    return (
        <div className="div-block-lang">
            {
                langs?.map((code) => {
                    if (code === lang) {
                        return <span className={`link-lang${lang === code ? ' selected' : ''}`} key={code}>{code.toUpperCase()}</span>;
                    }
                    if (!urls.length) {
                        return (
                            <button type="button" className={`link-lang${lang === code ? ' selected' : ''}`} key={code} onClick={async () => await setLanguage(code)}>{code.toUpperCase()}</button>
                        );
                    }
                    return (
                        <Link href={urls.find(u => u.lang === code)?.url || '/'} locale={code} key={code} className={`link-lang${lang === code ? ' selected' : ''}`}>
                            {code.toUpperCase()}
                        </Link>
                    );
                })
            }
        </div>
    );
}