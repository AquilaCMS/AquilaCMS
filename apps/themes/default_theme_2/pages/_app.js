import React, { useEffect, useState } from 'react';
import { Provider }                   from 'react-redux';
import { DefaultSeo }                 from 'next-seo';
import GenericHoc                     from '@components/common/GenericHoc';
import FacebookPixel                  from '@components/tools/FacebookPixel';
import { useStore }                   from '@lib/redux/store';
import { useLoadModules }             from '@lib/hooks';
import { getAqModulesClient }         from '@lib/utils';

import '@styles/normalize.css';
import '@styles/webflow.css';
import '@styles/styles.webflow.css';
import '@styles/globals.css';
import '@styles/animations.css';
import '@styles/custom.css';

const AquilaTheme = ({ Component, pageProps }) => {
    const [stateModuleHook, setStateModuleHook] = useState(null);
    const store                                 = useStore(pageProps.initialReduxState);
    const modulesHooks                          = useLoadModules([
        { id: 'global' }
    ]);

    useEffect(() => {
        const globalAqModules = Object.keys(modulesHooks);    
        if (globalAqModules.length > 0) {
            const modules = {};    
            for (const aqModule of globalAqModules) {
                modules[aqModule.code] = false;
            }
            store.dispatch({
                type: 'SET_AQMODULES',
                data: modules
            });
            setStateModuleHook(modulesHooks['global']);
        } else {
            store.dispatch({
                type: 'SET_AQMODULES',
                data: {}
            });
        }
    }, [modulesHooks]);

    return (
        <Provider store={store}>
            <GenericHoc>
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
                    { stateModuleHook }
                    <Component {...pageProps} />
                </FacebookPixel>
            </GenericHoc>
        </Provider>
    );
};

export default AquilaTheme;
