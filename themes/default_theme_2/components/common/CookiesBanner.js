import { useEffect, useState } from 'react';
import { useRouter }           from 'next/router';
import useTranslation          from 'next-translate/useTranslation';
import parse                   from 'html-react-parser';
import cookie                  from 'cookie';
import { getBlockCMS }         from '@aquilacms/aquila-connector/api/blockcms';
import { useCookieNotice }     from '@lib/hooks';

export default function CookiesBanner() {
    const [show, setShow]         = useState(false);
    const { setCookieNotice }     = useCookieNotice();
    const router                  = useRouter();
    const { lang, t }             = useTranslation();
    const [txtLegal, setTxtLegal] = useState(t('components/cookiesBanner:defaultTxt'));

    useEffect(() => {
        const cookieNotice = cookie.parse(document.cookie).cookie_notice;
        const fetchData    = async () => {
            const response = await getBlockCMS('CookiesBan', lang);
            if (response.content) {
                setTxtLegal(response.content);
            }
        };
        if (cookieNotice === 'true' || cookieNotice === 'deny') {
            setShow(false);
        } else {
            setShow(true);
            fetchData();
        }
    }, []);

    const acceptCookie = () => {
        document.cookie = 'cookie_notice=true; path=/;';
        setCookieNotice('true');
        setShow(false);
        router.reload();
    };

    const denyCookie = () => {
        document.cookie = 'cookie_notice=deny; path=/;';
        setCookieNotice('deny');
        setShow(false);
    };

    if (show) {
        return (

            <div className="div-block-cookies">
                <blockquote className="block-quote-rgpd">Cookies<br />&amp;<br />RGPD</blockquote>
                <p className="paragraph-rgpd">{parse(txtLegal)}</p>
                <button type="button" onClick={acceptCookie} className="button-white w-button">{t('components/cookiesBanner:agree')}</button>
                &nbsp;
                <button type="button" onClick={denyCookie} className="button-white w-button">{t('components/cookiesBanner:deny')}</button>
            </div>

        );
    }
    else {
        return null;
    }
}