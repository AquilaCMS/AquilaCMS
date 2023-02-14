import { useEffect }        from 'react';
import Script               from 'next/script';
import { useRouter }        from 'next/router';
import { GTM_ID, pageview } from '@lib/common/google-tag-manager/gtm';
import { useCookieNotice }  from '@lib/hooks';

const GoogleTagManager = ({ children }) => {
    const { cookieNotice } = useCookieNotice();
    const router           = useRouter();
    
    useEffect(() => {
        if (cookieNotice === true) {
            router.events.on('routeChangeComplete', pageview);
        }
        return () => {
            router.events.off('routeChangeComplete', pageview);
        };
    }, [router.events]);

    if (!GTM_ID || cookieNotice !== 'true') return children;
    return (
        <>
            {/* Google Tag Manager - Global base code */}
            <Script
                id="googletagmanager-script"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer', '${GTM_ID}');
                `,
                }}
            />
            { children }
        </>
    );
};

export default GoogleTagManager;