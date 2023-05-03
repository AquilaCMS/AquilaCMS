import React            from 'react';
import { Provider }     from 'react-redux';
import { DefaultSeo }   from 'next-seo';
import GoogleTagManager from '@components/tools/GoogleTagManager';
import FacebookPixel    from '@components/tools/FacebookPixel';
import { useStore }     from '@lib/redux/store';

import '@styles/normalize.css';
import '@styles/webflow.css';
import '@styles/styles.webflow.css';
import '@styles/globals.css';
import '@styles/animations.css';
import '@styles/custom.css';

function AquilaTheme({ Component, pageProps }) {
    const store = useStore(pageProps.initialReduxState);
    return (
        <Provider store={store}>
            <GoogleTagManager>
                <FacebookPixel>
                    <DefaultSeo
                        openGraph={{
                            type: 'website'
                        }}
                        twitter={{
                            handle  : '@handle',
                            site    : '@site',
                            cardType: 'summary_large_image',
                        }}
                    />
                    <Component {...pageProps} />
                </FacebookPixel>
            </GoogleTagManager>
        </Provider>
    );
}

export default AquilaTheme;
