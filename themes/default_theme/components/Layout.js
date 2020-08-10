import React from 'react';
import axios from 'axios';
import {
    NSContext, NSToast, scrollToTop, NSCookieBanner
} from 'aqlrc';
import { withRouter } from 'next/router';
import CMS from './CMS';
import { Router } from 'routes';
import { withI18next } from 'lib/withI18n';
import { listModulePage } from 'lib/utils';

/**
 * Layout - Squelette de la page (header / contenu / footer)
 * @return {React.Component}
 */

class Layout extends React.Component {
    componentDidMount = () => {
        Router.onRouteChangeComplete = () => {
            if (typeof window !== 'undefined' && window.location.hash === '') scrollToTop(1000);
        };
        axios.interceptors.request.use((config) => {
            // spinning start to show
            // UPDATE: Add this code to show global loading indicator
            if (typeof window !== 'undefined') {
                const requestSent = new window.CustomEvent('requestSent', { detail: {} });
                window.dispatchEvent(requestSent);
            }
            return config;
        }, (error) => {
            if (typeof window !== 'undefined') {
                const requestSent = new window.CustomEvent('requestSent', { detail: {} });
                window.dispatchEvent(requestSent);
            }
            Promise.reject(error);
        });

        axios.interceptors.response.use((response) => {
            // spinning hide
            // UPDATE: Add this code to hide global loading indicator
            if (typeof window !== 'undefined') {
                const responseReceive = new window.CustomEvent('responseReceive', { detail: {} });
                window.dispatchEvent(responseReceive);
            }
            return response;
        }, (error) => {
            if (typeof window !== 'undefined') {
                const responseReceive = new window.CustomEvent('responseReceive', { detail: {} });
                window.dispatchEvent(responseReceive);
            }
            /* if (error && error.response && error.response.data && error.response.data.message) {
                if (error.response.status < 300) {
                    NSToast.success(error.response.data.message);
                } else if (error.response.status < 400) {
                    NSToast.warn(error.response.data.message);
                } else {
                    switch (error.response.data.code) {
                    case 'invalid_objectid_error':
                        if (typeof window !== 'undefined') {
                            window.localStorage.removeItem('cart_id');
                        }
                        break;
                    case 'NOT_FOUND':
                        if (typeof window !== 'undefined') {
                            window.localStorage.removeItem('cart_id');
                        }
                        break;
                    default:
                        NSToast.error(error.response.data.message);
                    }
                }
            } */
            return Promise.reject(error);
        });
    }

    render() {
        const {
            header, children, footer, t
        } = this.props;
        const { messageCookie, themeConfig } = this.context.state;
        return (
            <>
                <NSToast />
                {
                    listModulePage('global')
                }
                <CMS ns-code="header" content={header} />
                {children}
                {themeConfig && themeConfig.showFooter && <CMS ns-code="footer" content={footer} />}
                <NSCookieBanner message={messageCookie} button-accept-text={t('common:buttonCookieAccept')} button-deny-text={t('common:buttonCookieDeny')} />
            </>
        );
    }

    static defaultProps = {
        header : '',
        footer : '',
    };

    static contextType = NSContext;
}
export default withRouter(withI18next(['common'])(Layout));
